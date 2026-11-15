import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { db, readSampleCsvText } from './server/db.ts';
import { DEMO_ROLES, getRolePermissions } from './src/lib/permissions.ts';
import type { UserRole } from './src/types/hvisa.ts';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

function readSessionToken(req: express.Request): string {
  const authHeader = String(req.header('Authorization') ?? '');
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return String(req.header('X-Auth-Token') ?? '').trim();
}

function extractActor(req: express.Request) {
  const token = readSessionToken(req);
  const session = token ? db.getAuthSession(token) : null;
  const rawRole = String(
    req.header('X-Demo-Role') ?? session?.user.role ?? 'LAB_ANALYST'
  ).toUpperCase();
  const validRole: UserRole =
    rawRole === 'REVIEWER_MICROBIOLOGIST' || rawRole === 'AUDITOR'
      ? rawRole
      : 'LAB_ANALYST';
  const roleDef = DEMO_ROLES[validRole];
  return {
    actorId: session ? session.user.username : roleDef.demoActorId,
    actorRole: validRole,
    permissions: getRolePermissions(validRole),
    user: session?.user ?? null,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health & synthetic sample CSV endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: 'DEMO_SYNTHETIC_LOCAL_SQLITE' });
  });

  // Authentication & Face Lock endpoints (persisted in SQLite)
  app.get('/api/auth/users', (_req, res) => {
    res.json({ users: db.listAuthUsersDirectory() });
  });

  app.get('/api/auth/session', (req, res) => {
    const token = readSessionToken(req);
    if (!token) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }
    const session = db.getAuthSession(token);
    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }
    res.json({ token, ...session });
  });

  app.post('/api/auth/register', (req, res) => {
    try {
      const { username, displayName, email, role, password, faceDescriptor, preferredLanguage } = req.body ?? {};
      const session = db.registerAuthUser({
        username,
        displayName,
        email,
        role,
        password,
        faceDescriptor,
        preferredLanguage,
      });
      res.status(201).json(session);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      const session = db.loginWithPassword(username, password);
      res.json(session);
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Sign-in failed' });
    }
  });

  app.post('/api/auth/face-login', (req, res) => {
    try {
      const { username, faceDescriptor } = req.body ?? {};
      const session = db.loginWithFace(faceDescriptor, username);
      res.json(session);
    } catch (err) {
      const code = (err as Error & { code?: string })?.code;
      res.status(401).json({
        code,
        error: err instanceof Error ? err.message : 'Face verification failed',
      });
    }
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    try {
      const { username, email } = req.body ?? {};
      const result = db.requestPasswordResetOtp(username, email);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Could not issue OTP' });
    }
  });

  app.post('/api/auth/reset-password', (req, res) => {
    try {
      const { username, email, otp, newPassword } = req.body ?? {};
      const result = db.resetPasswordWithOtp({ username, email, otp, newPassword });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Password reset failed' });
    }
  });

  app.post('/api/auth/change-password', (req, res) => {
    const token = readSessionToken(req);
    const session = token ? db.getAuthSession(token) : null;
    if (!session) {
      res.status(401).json({ error: 'Please sign in first.' });
      return;
    }
    try {
      const { currentPassword, newPassword } = req.body ?? {};
      const result = db.changeUserPassword(session.user.id, currentPassword, newPassword);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Password change failed' });
    }
  });

  app.patch('/api/auth/preferences', (req, res) => {
    const token = readSessionToken(req);
    const session = token ? db.getAuthSession(token) : null;
    if (!session) {
      res.status(401).json({ error: 'Please sign in first.' });
      return;
    }
    try {
      const { preferredLanguage, highContrast } = req.body ?? {};
      const user = db.updateUserPreferences(session.user.id, {
        preferredLanguage,
        highContrast,
      });
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save preferences' });
    }
  });

  app.post('/api/auth/face/enroll', (req, res) => {
    const token = readSessionToken(req);
    const session = token ? db.getAuthSession(token) : null;
    if (!session) {
      res.status(401).json({ error: 'Please sign in first to enroll Face Lock.' });
      return;
    }
    try {
      const user = db.enrollFaceLock(session.user.id, req.body?.faceDescriptor);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Face enrollment failed' });
    }
  });

  app.delete('/api/auth/face/enroll', (req, res) => {
    const token = readSessionToken(req);
    const session = token ? db.getAuthSession(token) : null;
    if (!session) {
      res.status(401).json({ error: 'Please sign in first.' });
      return;
    }
    try {
      const user = db.disableFaceLock(session.user.id);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to disable Face Lock' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = readSessionToken(req);
    const allDevices = Boolean(req.body?.allDevices);
    if (token) {
      if (allDevices) {
        const session = db.getAuthSession(token);
        if (session) db.logoutAllUserSessions(session.user.id);
      }
      db.logoutAuthSession(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/demo/sample-csv', (_req, res) => {
    res.json({ csv: readSampleCsvText() });
  });

  // Dashboard, Public Portal Overview & Comparative Analysis
  app.get('/api/portal/overview', (_req, res) => {
    res.json(db.getPublicPortalOverview());
  });

  app.get('/api/dashboard', (_req, res) => {
    res.json(db.getDashboardSummary());
  });

  app.get('/api/comparative', (_req, res) => {
    res.json(db.getComparativeData());
  });

  app.get('/api/audit', (_req, res) => {
    res.json({ events: db.getGlobalAuditHistory(150) });
  });

  // Protocols & Reference Strains
  app.get('/api/protocols', (_req, res) => {
    res.json({
      protocols: db.listProtocols(),
      referenceStrains: db.listReferenceStrains(),
    });
  });

  app.post('/api/protocols', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canCreateProtocolProfile) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" does not have permission to create protocol profiles.`,
      });
      return;
    }
    try {
      const created = db.createProtocol(req.body, actor);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid protocol definition' });
    }
  });

  app.put('/api/protocols/:id', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canConfigureProtocolThresholds) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" does not have permission to edit protocol thresholds or rules.`,
      });
      return;
    }
    try {
      const updated = db.updateProtocol(req.params.id, req.body, actor);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid protocol update' });
    }
  });

  // Experiments
  app.get('/api/experiments', (_req, res) => {
    res.json(db.listExperiments());
  });

  app.post('/api/experiments', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canCreateExperiment) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot create experiments. Switch to Lab Analyst.`,
      });
      return;
    }
    try {
      const created = db.createExperiment(req.body, actor);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create experiment' });
    }
  });

  app.post('/api/demo/load-sample', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canCreateExperiment) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot load demo experiments. Switch to Lab Analyst.`,
      });
      return;
    }
    try {
      const created = db.loadSampleDemoRun(actor);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load synthetic demo' });
    }
  });

  app.get('/api/experiments/:id', (req, res) => {
    const detail = db.getExperimentDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }
    res.json(detail);
  });

  app.patch('/api/experiments/:id', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canEditExperimentMetadata) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot edit experiment metadata.`,
      });
      return;
    }
    try {
      const updated = db.updateExperimentMetadata(req.params.id, req.body, actor);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update metadata' });
    }
  });

  // Observations (raw data preservation + calculation invalidation)
  app.put('/api/experiments/:id/observations', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canEditObservations) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot modify raw observations.`,
      });
      return;
    }
    try {
      const rows = Array.isArray(req.body?.observations) ? req.body.observations : [];
      const updated = db.replaceObservations(req.params.id, rows, actor);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save observations' });
    }
  });

  // Validate & Calculate
  app.post('/api/experiments/:id/validate', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canRunValidationAndCalculation) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot run validation.`,
      });
      return;
    }
    try {
      const updated = db.validateExperiment(req.params.id, actor);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Validation failed' });
    }
  });

  app.post('/api/experiments/:id/calculate', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canRunValidationAndCalculation) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot execute PAP-AUC calculation.`,
      });
      return;
    }
    try {
      const result = db.calculateExperiment(req.params.id, actor);
      if (!result.ok) {
        res.status(422).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Calculation failed' });
    }
  });

  // QA Flag acknowledgement & Reviews
  app.post('/api/experiments/:id/qa-flags/:flagId/acknowledge', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canAcknowledgeQaFlags) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot acknowledge QA flags. Switch to Reviewer / Microbiologist.`,
      });
      return;
    }
    try {
      const updated = db.acknowledgeQaFlag(req.params.id, req.params.flagId, actor);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to acknowledge flag' });
    }
  });

  app.post('/api/experiments/:id/reviews', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canSubmitReview) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot submit reviews. Switch to Reviewer / Microbiologist.`,
      });
      return;
    }
    try {
      const { decision, comment } = req.body ?? {};
      const updated = db.addReview(req.params.id, decision, comment ?? '', actor);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Review submission failed' });
    }
  });

  // Optional plain-language QA explanation (never alters data, never gives clinical advice)
  app.post('/api/qa/explain', async (req, res) => {
    const { code, message, resolutionHint } = req.body ?? {};
    if (!message) {
      res.status(400).json({ error: 'QA flag message is required' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        source: 'deterministic-guide',
        explanation: `${message} — Laboratory QA guidance: ${resolutionHint || 'Verify raw plate counts, dilution fractions, and same-run Mu3 reference alignment against your laboratory SOP.'} (Note: No clinical or treatment interpretation is provided.)`,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Explain this microbiology PAP-AUC laboratory quality-assurance flag in 2 concise, plain-language sentences for a lab technician. Focus strictly on assay data hygiene and plate-count troubleshooting. Do NOT mention patients, clinical diagnosis, antibiotics treatment, or alter numbers.\nCode: ${code}\nFlag: ${message}\nHint: ${resolutionHint}`,
      });
      res.json({
        source: 'gemini-qa-assistant',
        explanation: response.text?.trim() || `${message} ${resolutionHint}`,
      });
    } catch {
      res.json({
        source: 'deterministic-guide',
        explanation: `${message} — Laboratory QA guidance: ${resolutionHint || 'Verify raw plate counts and protocol settings.'}`,
      });
    }
  });

  // Tribal Outreach, Cold-Chain Field Dispatches, Offline Sync & Mobile Camps
  app.get('/api/tribal/overview', (_req, res) => {
    res.json(db.getTribalOutreachOverview());
  });

  app.get('/api/tribal/clusters', (_req, res) => {
    res.json({ clusters: db.listTribalClusters() });
  });

  app.post('/api/tribal/clusters', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canManageFieldOutreach) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" has read-only access and cannot register tribal PHC clusters.`,
      });
      return;
    }
    try {
      const created = db.createTribalCluster(req.body, actor);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create cluster' });
    }
  });

  app.get('/api/tribal/dispatches', (_req, res) => {
    res.json({ dispatches: db.listFieldDispatches() });
  });

  app.post('/api/tribal/dispatches', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canManageFieldOutreach) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot log field dispatches. Switch to Analyst or Reviewer.`,
      });
      return;
    }
    try {
      const created = db.createFieldDispatch(req.body, actor);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to log field dispatch' });
    }
  });

  app.post('/api/tribal/dispatches/bulk-sync', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canManageFieldOutreach) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot sync offline field dispatches.`,
      });
      return;
    }
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const result = db.bulkSyncFieldDispatches(items, actor);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Offline queue sync failed' });
    }
  });

  app.patch('/api/tribal/dispatches/:id/status', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canManageFieldOutreach) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot update dispatch status.`,
      });
      return;
    }
    if (req.body?.status === 'REPORT_RETURNED' && !actor.permissions.canReturnCommunityReport) {
      res.status(403).json({
        error: 'Only Reviewer / Microbiologist can mark a sample report returned to the village PHC.',
      });
      return;
    }
    try {
      const updated = db.updateDispatchStatus(req.params.id, req.body ?? {}, actor);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update dispatch' });
    }
  });

  app.get('/api/tribal/camps', (_req, res) => {
    res.json({ camps: db.listMobileCamps() });
  });

  app.post('/api/tribal/camps', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canManageFieldOutreach) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot schedule mobile outreach camps.`,
      });
      return;
    }
    try {
      const created = db.createMobileCamp(req.body, actor);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to schedule camp' });
    }
  });

  app.patch('/api/tribal/camps/:id/status', (req, res) => {
    const actor = extractActor(req);
    if (!actor.permissions.canManageFieldOutreach) {
      res.status(403).json({
        error: `Role "${DEMO_ROLES[actor.actorRole].label}" cannot update camp status.`,
      });
      return;
    }
    try {
      const updated = db.updateCampStatus(req.params.id, req.body?.status, actor);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update camp status' });
    }
  });

  app.post('/api/tribal/community-summary', async (req, res) => {
    const { experimentId, language = 'en' } = req.body ?? {};
    const detail = experimentId ? db.getExperimentDetail(String(experimentId)) : null;

    const runLabel = detail ? detail.experiment.runId : 'Selected Lab Run';
    const status = detail ? detail.experiment.status : 'DRAFT';
    const hasHvisa =
      detail?.latestCalculation?.results.testProfiles.some(
        (p) => p.interpretationBand === 'COMPATIBLE_HVISA' || p.interpretationBand === 'EXPERT_REVIEW_VISA_RANGE'
      ) ?? false;

    const fallbackByLang: Record<string, string> = {
      en: `Lab Update (${runLabel}): Quality status is ${status}. ${
        hasHvisa
          ? 'The lab observed bacteria that need specialist microbiologist verification. Ask community members to complete prescribed doctor visits, wash hands with soap, and keep wounds covered.'
          : 'Laboratory quality checks are in progress or within baseline range. Continue regular wound hygiene and complete any prescribed PHC medicine courses.'
      } (For health-worker awareness only; not a personal diagnosis.)`,
      hi: `लैब अपडेट (${runLabel}): जांच की स्थिति ${status} है। ${
        hasHvisa
          ? 'लैब ने ऐसे नमूने देखे हैं जिनकी विशेषज्ञ माइक्रोबायोलॉजिस्ट द्वारा पुनः जांच जरूरी है। गांव में सभी से डॉक्टर की पूरी दवा लेने, साबुन से हाथ धोने और घाव ढककर रखने की अपील करें।'
          : 'लैब गुणवत्ता जांच सामान्य या प्रक्रियाधीन है। साफ पानी, साबुन से हाथ धोने और पूरी दवा लेने की सलाह जारी रखें।'
      } (यह केवल स्वास्थ्य कार्यकर्ता जागरूकता हेतु है, व्यक्तिगत निदान नहीं।)`,
      mr: `प्रयोगशाळा अद्यतन (${runLabel}): तपासणी स्थिती ${status} आहे. ${
        hasHvisa
          ? 'प्रयोगशाळेने तज्ज्ञ सूक्ष्मजीवशास्त्रज्ञांच्या तपासणीची आवश्यकता असलेले नमुने नोंदवले आहेत. गावातील नागरिकांना डॉक्टरांचा पूर्ण औषध कोर्स पूर्ण करण्यास, साबणाने हात धुण्यास आणि जखमा स्वच्छ ठेवण्यास सांगा.'
          : 'प्रयोगशाळेची गुणवत्ता तपासणी सुरू आहे किंवा सामान्य मर्यादेत आहे. नियमित स्वच्छता आणि औषधांचा पूर्ण कोर्स पाळण्यास मदत करा.'
      } (केवळ आरोग्य सेवक मार्गदर्शनासाठी; वैयक्तिक निदान नाही.)`,
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        source: 'deterministic-multilingual-guide',
        language,
        summary: fallbackByLang[String(language)] || fallbackByLang.en,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a 2-3 sentence plain-language summary for a rural community health worker (ASHA worker) in language code "${language}" (en=English, hi=Hindi, mr=Marathi).
Context: Lab Run ${runLabel}, status=${status}, elevated PAP-AUC signal present=${hasHvisa}.
Rules: Do NOT mention patients, names, specific antibiotic drug prescriptions, or clinical treatment. Focus strictly on encouraging follow-up with the PHC doctor, finishing prescribed courses, handwashing, and wound hygiene.`,
      });
      res.json({
        source: 'gemini-community-translator',
        language,
        summary: response.text?.trim() || fallbackByLang[String(language)] || fallbackByLang.en,
      });
    } catch {
      res.json({
        source: 'deterministic-multilingual-guide',
        language,
        summary: fallbackByLang[String(language)] || fallbackByLang.en,
      });
    }
  });

  // Mount Vite middleware in dev, or serve static dist in production
  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(distDir);
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`hVISA Insight server listening on http://localhost:${PORT}`);
  });
}

startServer();
