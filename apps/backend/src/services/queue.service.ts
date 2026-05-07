import { testQueue } from '../queue/queue.client';
import { JOB_NAMES } from '@api-perf/shared';
import type { TestConfig, TestJobData } from '@api-perf/shared';

export async function enqueueTestJobs(runId: string, config: TestConfig): Promise<string[]> {
  const totalWorkers = config.concurrency;
  const jobIds: string[] = [];

  for (let i = 0; i < totalWorkers; i++) {
    const jobData: TestJobData = {
      runId,
      configId: config.id,
      config,
      workerIndex: i,
      totalWorkers,
    };

    const job = await testQueue.add(JOB_NAMES.EXECUTE_TEST, jobData, {
      jobId: `${runId}:worker:${i}`,
      attempts: 1,
    });
    jobIds.push(job.id!);
  }

  return jobIds;
}

export async function cancelTestJobs(jobIds: string[]): Promise<void> {
  await Promise.allSettled(
    jobIds.map(async (jobId) => {
      const job = await testQueue.getJob(jobId);
      if (job) await job.remove();
    }),
  );
}
