import {Action, ActionContainer} from "@/actions";
import {safeDump} from "js-yaml";
import TopologicalSort from "topological-sort";
import RuntimeError = WebAssembly.RuntimeError;

interface Step {
  action: Action;
  x: number;
  y: number;
  name: string;
  id: string;
  run: string;
  inputs: {
    type: string;
    id: string;
  }[];
  outputs: {
    type: string;
    id: string;
  }[];
}

interface Connection {
  from: {
    step: Step;
    output: string | null;
  };
  to: {
    step: Step;
    input: string | null;
  };
}

enum CheckRunTypes {
  created = 'created',
  rerequested = 'rerequested',
  completed = 'completed',
  requestedAction = 'requested_action'
}
enum CheckSuiteTypes {
  completed = 'completed',
  requested = 'requested',
  rerequested = 'rerequested'
}
enum IssueCommentTypes {
  created = 'created',
  edited = 'edited',
  deleted = 'deleted'
}
enum IssuesTypes {
  opened = 'opened',
  edited = 'edited',
  deleted = 'deleted',
  transferred = 'transferred',
  pinned = 'pinned',
  unpinned = 'unpinned',
  closed = 'closed',
  reopened = 'reopened',
  assigned = 'assigned',
  unassigned = 'unassigned',
  labeled = 'labeled',
  unlabeled = 'unlabeled',
  locked = 'locked',
  unlocked = 'unlocked',
  milestoned = 'milestoned',
  demilestoned = 'demilestoned'
}
enum LabelTypes {
  created = 'created',
  edited = 'edited',
  deleted = 'deleted'
}
enum MilestoneTypes {
  created = 'created',
  closed = 'closed',
  opened = 'opened',
  edited = 'edited',
  deleted = 'deleted'
}
enum ProjectTypes {
  created = 'created',
  updated = 'updated',
  closed = 'closed',
  opened = 'reopened',
  edited = 'edited',
  deleted = 'deleted'
}
enum ProjectCardTypes {
  created = 'created',
  moved = 'moved',
  converted = 'converted',
  edited = 'edited',
  deleted = 'deleted'
}
enum ProjectColumnTypes {
  created = 'created',
  edited = 'edited',
  moved = 'moved',
  deleted = 'deleted'
}
enum PullRequestTypes {
  assigned = 'assigned',
  unassigned = 'unassigned',
  labeled = 'labeled',
  unlabeled = 'unlabeled',
  opened = 'opened',
  edited = 'edited',
  closed = 'closed',
  reopened = 'reopened',
  synchronize = 'synchronize',
  readyForReview = 'ready_for_review',
  locked = 'locked',
  unlocked = 'unlocked',
  reviewRequested = 'review_requested',
  reviewRequestRemoved = 'review_request_removed'
}
enum PullRequestReviewTypes {
  submitted = 'submitted',
  edited = 'edited',
  dismissed = 'dismissed'
}
enum PullRequestReviewCommentTypes {
  created = 'created',
  edited = 'edited',
  deleted = 'deleted'
}
enum PullRequestTargetTypes {
  assigned = 'assigned',
  unassigned = 'unassigned',
  labeled = 'labeled',
  unlabeled = 'unlabeled',
  opened = 'opened',
  edited = 'edited',
  closed = 'closed',
  reopened = 'reopened',
  synchronize = 'synchronize',
  readyForReview = 'ready_for_review',
  locked = 'locked',
  unlocked = 'unlocked',
  reviewRequested = 'review_requested',
  reviewRequestRemoved = 'review_request_removed'
}
enum RegistryPackageTypes {
  published = 'published',
  updated = 'updated'
}
enum ReleaseTypes {
  published = 'published',
  unpublished = 'unpublished',
  created = 'created',
  edited = 'edited',
  deleted = 'deleted',
  prereleased = 'prereleased',
  released = 'released'
}
enum WatchTypes {
  started = 'started'
}
enum WorkflowRunTypes {
  completed = 'completed',
  requested = 'requested'
}

interface Triggers {
  check_run?: { types?: CheckRunTypes[] };
  check_suite?: { types?: CheckSuiteTypes[] };
  create?: {};
  delete?: {};
  deployment?: {};
  deployment_status?: {};
  fork?: {};
  gollum?: {};
  issue_comment?: { types?: IssueCommentTypes[] };
  issues?: { types?: IssuesTypes[] };
  label?: { types?: LabelTypes[] };
  milestone?: { types?: MilestoneTypes[] };
  page_build?: {};
  project?: { types?: ProjectTypes[] };
  project_card?: { types?: ProjectCardTypes[] };
  project_column?: { types?: ProjectColumnTypes[] };
  public?: {};
  pull_request?: {
    types?: PullRequestTypes[];
    branches?: string[];
    'branches-ignore'?: string[];
    tags?: string[];
    'tags-ignore'?: string[];
  };
  pull_request_review?: { types?: PullRequestReviewTypes[] };
  pull_request_review_comment?: { types?: PullRequestReviewCommentTypes[] };
  pull_request_target?: { types?: PullRequestTargetTypes[] };
  push?: {
    branches?: string[];
    'branches-ignore'?: string[];
    tags?: string[];
    'tags-ignore'?: string[];
  };
  registry_package?: { types?: RegistryPackageTypes[] };
  release?: { types?: ReleaseTypes[] };
  status?: {};
  watch?: { types?: WatchTypes[] };
  workflow_run?: { types?: WorkflowRunTypes[] };

  schedule?: { schedule: { cron: string }[] };
  workflow_dispatch?: {};
  repository_dispatch?: {};
}

enum RunsOn {
  windowsLatest = 'windows-latest',
  windows2019 = 'windows-2019',
  ubuntuLatest = 'ubuntu-latest',
  ubuntu2004 = 'ubuntu-20.04',
  ubuntu1804 = 'ubuntu-18.04',
  ubuntu1604 = 'ubuntu-16.04',
  macosLatest = 'macos-latest',
  macos1015 = 'macos-10.15'
}

class Workflow {
  steps: Step[];
  connections: Connection[];
  name: string;
  on: Triggers;
  runsOn: RunsOn;

  constructor() {
    this.steps = []
    this.connections = []
    this.name = 'My workflow'
    this.on = {}
    this.runsOn = RunsOn.ubuntuLatest
  }

  async load (actions: ActionContainer) {
    const raw = localStorage.getItem('workflow')
    if (raw) {
      const parsed = JSON.parse(raw)
      const actionIds = [...new Set(parsed.steps.map((s: any) => s.action))]
      const loadedActions = Object.fromEntries(
        await Promise.all(actionIds.map(async (id) => [id, await actions.get(id as string)]))
      )

      this.steps = parsed.steps.map((s: any) => {
        return {
          ...s,
          action: loadedActions[s.action]
        }
      })

      const steps = Object.fromEntries(this.steps.map((s: Step) => [s.id, s]))
      this.connections = parsed.connections.map((s: any) => {
        return {
          from: {
            step: steps[s.fromStep],
            output: s.fromOutput
          },
          to: {
            step: steps[s.toStep],
            input: s.toInput
          }
        }
      })
    }
  }
  save () {
    const steps = this.steps.map((s: Step) => {
      if (!s.action.id) {
        throw new RuntimeError()
      }
      return {
        ...s,
        action: s.action.id
      }
    })
    const connections = this.connections.map((s: Connection) => {
      return {
        fromStep: s.from.step.id,
        fromOutput: s.from.output,
        toStep: s.to.step.id,
        toInput: s.to.input
      }
    })
    localStorage.setItem('workflow', JSON.stringify({ steps, connections }))
  }

  add (action: Action) {
    this.steps.push({
      action: action,
      x: 0,
      y: 0,
      name: action.name || '',
      run: '',
      id: this.generateId(action),
      inputs: (action.inputs || []).map((i: any) => { return { id: i.id, type: i.type } }),
      outputs: (action.outputs || []).map((i: any) => { return { id: i.id, type: i.type } })
    })
  }
  remove (step: Step) {
    const index = this.steps.indexOf(step)
    if (index === -1) {
      return
    }
    this.steps.splice(index, 1)
    let found = true
    while (found) {
      found = false
      for (let i = 0; i < this.connections.length; ++i) {
        if (this.connections[i].from.step === step || this.connections[i].to.step === step) {
          this.connections.splice(i, 1)
          found = true
          break
        }
      }
    }
  }

  generate (): string {
    const sort = new TopologicalSort(new Map(this.steps.map((s: Step) => [s.id, s])));
    for (const connection of this.connections) {
      sort.addEdge(connection.from.step.id, connection.to.step.id)
    }
    const steps = [...sort.sort().values()].map((v: any) => v.node).map((step: Step) => {
      const out: {
        id: string;
        if?: string;
        name: string;
        uses?: string;
        shell?: string;
        run?: string;
        env?: object;
        with?: object;
      } = {
        id: step.id,
        name: step.name
      }
      if (step.action.id.startsWith('_shell/')) {
        out.shell = step.action.id.replace('_shell/', '')
        out.run = step.run
      } else {
        out.uses = step.action.id
      }

      const env: { [key: string]: string } = {}
      const args: { [key: string]: string } = {}
      for (const connection of this.connections) {
        if (connection.to.step === step) {
          const input = step.inputs.find(e => e.id === connection.to.input)
          if (!input) {
            continue
          }
          if (input.type === 'env-custom') {
            env[input.id as string] = '${{ steps.' + connection.from.step.id + '.outputs.' + connection.from.output + ' }}'
          } else {
            args[input.id as string] = '${{ steps.' + connection.from.step.id + '.outputs.' + connection.from.output + ' }}'
          }
        }
      }
      if (Object.keys(env).length > 0) {
        out.env = env
      }
      if (Object.keys(args).length > 0) {
        out.with = args
      }

      return out
    })

    const workflow = {
      name: this.name,
      on: this.on,
      jobs: {
        job: {
          name: this.name,
          'runs-on': this.runsOn,
          steps: steps
        }
      }
    }
    console.warn(workflow)

    return safeDump(workflow)
  }

  private generateId(action: Action): string {
    const ourId = action.id.split('/')[1].split('@')[0]
    for (let i = 0; ; ++i) {
      const candidate = ourId + (i === 0 ? '' : `-${i}`)
      if (!this.steps.find((value: Step) => value.id === candidate)) {
        return candidate
      }
    }
  }
}

export {
  Step,
  Connection,
  Workflow
}
