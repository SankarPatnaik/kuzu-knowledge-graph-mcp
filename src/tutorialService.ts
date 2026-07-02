import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { KuzuGraph } from './kuzuGraph.js';
import { KnowledgeGraphService } from './knowledgeGraphService.js';
import { TUTORIALS, tutorialSummary, type Tutorial } from './tutorials.js';
import type { JsonValue } from './types.js';

type PracticeState = {
  service: KnowledgeGraphService;
  loadedAt: string;
  runId: string;
};

type TutorialProgress = {
  started: Set<string>;
  completed: Set<string>;
  practiceQueriesRun: number;
};

export class TutorialService {
  private readonly practice = new Map<string, PracticeState>();
  private readonly progress: TutorialProgress = {
    started: new Set<string>(),
    completed: new Set<string>(),
    practiceQueriesRun: 0,
  };

  constructor(private readonly rootDir = path.resolve('.kuzu-practice')) {}

  listTutorials(): Record<string, JsonValue> {
    return {
      tutorials: TUTORIALS.map((tutorial) => ({
        ...tutorialSummary(tutorial),
        practice: this.practiceStatus(tutorial.id),
        completed: this.progress.completed.has(tutorial.id),
        started: this.progress.started.has(tutorial.id),
      })),
      progress: this.getTutorialProgress(),
      topics: [
        'Getting Started',
        'Data Import',
        'Cypher Basics',
        'Graph Modeling',
        'Network Analysis',
        'Python',
        'JavaScript / Node.js',
        'Marimo / Notebook',
        'Advanced Queries',
      ],
      attribution: {
        source: 'kuzudb/tutorials',
        license: 'MIT',
        url: 'https://github.com/kuzudb/tutorials/tree/main/src',
      },
    };
  }

  getTutorial(id: string): Record<string, JsonValue> {
    const tutorial = this.findTutorial(id);
    return {
      ...tutorial,
      practice: this.practiceStatus(id),
      completed: this.progress.completed.has(id),
      started: this.progress.started.has(id),
    } as unknown as Record<string, JsonValue>;
  }

  getTutorialProgress(): Record<string, JsonValue> {
    return {
      tutorialsStarted: this.progress.started.size,
      tutorialsCompleted: this.progress.completed.size,
      practiceQueriesRun: this.progress.practiceQueriesRun,
      completedIds: [...this.progress.completed],
      startedIds: [...this.progress.started],
    };
  }

  async loadTutorialDataset(id: string): Promise<Record<string, JsonValue>> {
    const tutorial = this.findTutorial(id);
    if (!tutorial.dataset) {
      throw new Error('This tutorial does not include a bundled practice dataset.');
    }

    await this.resetTutorialDataset(id);
    const runId = this.newRunId();
    const service = await this.createPracticeService(id, runId);
    for (const document of tutorial.dataset.documents) {
      await service.createKnowledgeGraph(document);
    }

    const loadedAt = new Date().toISOString();
    this.practice.set(id, { service, loadedAt, runId });
    this.progress.started.add(id);

    return {
      tutorialId: id,
      loaded: true,
      loadedAt,
      storage: this.storageLabel(id, runId),
      message: 'Practice dataset loaded into an isolated sandbox database.',
      overview: await service.overview(),
    };
  }

  async resetTutorialDataset(id: string): Promise<Record<string, JsonValue>> {
    this.findTutorial(id);
    this.practice.delete(id);
    await fs.rm(this.practicePath(id), { recursive: true, force: true });

    return {
      tutorialId: id,
      loaded: false,
      storage: this.storageLabel(id),
      message: 'Practice sandbox reset. Active database was not modified.',
    };
  }

  async getTutorialSchema(id: string): Promise<Record<string, JsonValue>> {
    const tutorial = this.findTutorial(id);
    const state = this.practice.get(id);

    return {
      tutorialId: id,
      schema: tutorial.schema ?? null,
      practice: this.practiceStatus(id),
      runtimeSchema: state ? await state.service.schema() : null,
    };
  }

  async runTutorialQuery(id: string, query: string): Promise<Record<string, JsonValue>> {
    this.findTutorial(id);
    const state = this.practice.get(id);
    if (!state) {
      throw new Error('Load the tutorial dataset before running practice queries.');
    }

    const result = await state.service.runReadOnlyCypher(query, 100);
    this.progress.started.add(id);
    this.progress.practiceQueriesRun += 1;
    return {
      tutorialId: id,
      ...result,
      practice: this.practiceStatus(id),
    };
  }

  async tutorialGraph(id: string): Promise<Record<string, JsonValue>> {
    this.findTutorial(id);
    const state = this.practice.get(id);
    if (!state) {
      throw new Error('Load the tutorial dataset before opening it in Explore Graph.');
    }

    return {
      tutorialId: id,
      practice: this.practiceStatus(id),
      ...(await state.service.graphSnapshot(300)),
    };
  }

  markTutorialComplete(id: string): Record<string, JsonValue> {
    this.findTutorial(id);
    this.progress.started.add(id);
    this.progress.completed.add(id);
    return {
      tutorialId: id,
      completed: true,
      progress: this.getTutorialProgress(),
    };
  }

  syncOfficialKuzuTutorials(): Record<string, JsonValue> {
    return {
      status: 'not_implemented',
      message:
        'Runtime browser sync is intentionally disabled. Use a future admin-only script to convert kuzudb/tutorials source files into local tutorial assets.',
      source: 'https://github.com/kuzudb/tutorials/tree/main/src',
    };
  }

  private findTutorial(id: string): Tutorial {
    const tutorial = TUTORIALS.find((item) => item.id === id);
    if (!tutorial) {
      throw new Error(`Unknown tutorial: ${id}`);
    }
    return tutorial;
  }

  private async createPracticeService(id: string, runId: string): Promise<KnowledgeGraphService> {
    const service = new KnowledgeGraphService(
      new KuzuGraph({
        dbPath: this.practicePath(id, runId),
        autoCreateSchema: true,
        autoSeed: false,
      }),
    );
    await service.connect();
    return service;
  }

  private practiceStatus(id: string): Record<string, JsonValue> {
    const state = this.practice.get(id);
    return {
      loaded: Boolean(state),
      loadedAt: state?.loadedAt ?? null,
      storage: this.storageLabel(id, state?.runId),
      isolated: true,
      warning: 'Practice datasets are loaded into an isolated sandbox database and will not modify your active database.',
    };
  }

  private practicePath(id: string, runId?: string): string {
    const safeId = id.replace(/[^a-z0-9-]/gi, '-');
    return runId ? path.join(this.rootDir, safeId, runId) : path.join(this.rootDir, safeId);
  }

  private storageLabel(id: string, runId?: string): string {
    const safeId = id.replace(/[^a-z0-9-]/gi, '-');
    return runId ? `.kuzu-practice/${safeId}/${runId}` : `.kuzu-practice/${safeId}`;
  }

  private newRunId(): string {
    return `run-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }
}
