const { v4: uuidv4 } = require('uuid');

class JobService {
  constructor() {
    // In-memory job store: { jobId: { status, progress, message, result } }
    this.jobs = new Map();
  }

  createJob(meta = {}) {
    const id = uuidv4();
    const job = {
      id,
      status: 'pending', // pending | processing | completed | failed
      progress: 0,
      message: 'Queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meta,
      result: null,
      error: null
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(id) {
    return this.jobs.get(id) || null;
  }

  update(id, patch) {
    const job = this.jobs.get(id);
    if (!job) return null;
    Object.assign(job, patch);
    job.updatedAt = new Date().toISOString();
    this.jobs.set(id, job);
    return job;
  }

  complete(id, result = null) {
    return this.update(id, { status: 'completed', progress: 100, message: 'Completed', result });
  }

  fail(id, error) {
    const job = this.jobs.get(id) || {};
    return this.update(id, { status: 'failed', progress: job.progress || 0, message: error?.message || String(error), error: String(error) });
  }
}

module.exports = new JobService();
