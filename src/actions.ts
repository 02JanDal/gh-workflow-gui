import { Octokit } from '@octokit/rest';
import { safeLoad } from 'js-yaml';

interface ActionInput {
  type: string;
  id: string;
  description: string;
  default: string;
  required: boolean;
}
interface ActionOutput {
  type: string;
  id: string;
  description: string;
}
interface Action {
  id: string;
  name?: string;
  description?: string;
  urls?: {
    marketplace: string;
    repo: string;
  };
  stats?: {
    stars: number;
    issues: number;
  };
  inputs?: ActionInput[];
  outputs?: ActionOutput[];
}

class ActionContainer {
  standard: Action[]
  recommended: Action[]
  loaded: Action[]
  cache: { [key: string]: any }
  private readonly _octokit: Octokit;

  constructor(octokit: Octokit) {
    this.standard = []
    this.recommended = []
    this.loaded = []
    const cache = localStorage.getItem('action_cache')
    if (cache) {
      this.cache = JSON.parse(cache) as { [key: string]: any }
    } else {
      this.cache = {}
    }
    this._octokit = octokit
  }

  private async loadAction(action: Action): Promise<Action> {
    if (action.urls || action.id.startsWith('_')) {
      return action
    }

    const repoDescriptor = {
      owner: action.id.split('/')[0],
      repo: action.id.split('/')[1].split('@')[0]
    }
    const repoCacheKey = 'repo/' + repoDescriptor.owner + '/' + repoDescriptor.repo
    const fileCacheKey = 'file/' + repoDescriptor.owner + '/' + repoDescriptor.repo

    if (!Object.prototype.hasOwnProperty.call(this.cache, fileCacheKey)) {
      let file
      try {
        file = await this._octokit.repos.getContent({
          ...repoDescriptor,
          path: 'action.yaml'
        })
      } catch (error) {
        try {
          file = await this._octokit.repos.getContent({
            ...repoDescriptor,
            path: 'action.yml'
          })
        } catch (error) {
          console.error('could not load action.yaml or action.yml for', action.id)
          return action
        }
      }

      const yaml = atob(file.data.content)
      try {
        this.cache[fileCacheKey] = safeLoad(yaml) as {[key: string]: any}
        localStorage.setItem('action_cache', JSON.stringify(this.cache))
      } catch (error) {
        console.error('unable to load', action.id)
        console.warn(error)
        console.warn(yaml)
        return action
      }
    }

    if (!Object.prototype.hasOwnProperty.call(this.cache, repoCacheKey)) {
      this.cache[repoCacheKey] = (await this._octokit.repos.get(repoDescriptor)).data
      localStorage.setItem('action_cache', JSON.stringify(this.cache))
    }

    const json = this.cache[fileCacheKey]

    action.name = json.name
    action.description = json.description
    const marketplace = json.name
      ? ('https://github.com/marketplace/actions/' + json.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))
      : ''
    action.urls = {
      repo: 'https://github.com/' + repoDescriptor.owner + '/' + repoDescriptor.repo,
      marketplace: marketplace
    }
    if (json.inputs) {
      action.inputs = Object.entries(json.inputs).map((e: [string, any]) => {
        return {
          type: 'input',
          id: e[0],
          description: e[1].description || '',
          required: e[1].required || false,
          default: e[1].default || ''
        }
      })
    } else {
      action.inputs = []
    }
    if (json.outputs) {
      action.outputs = Object.entries(json.outputs).map((e: [string, any]) => {
        return {
          type: 'output',
          id: e[0],
          description: e[1].description || ''
        }
      })
    } else {
      action.outputs = []
    }

    const repo = this.cache[repoCacheKey]

    action.stats = {
      stars: repo.stargazers_count,
      issues: repo.open_issues
    }

    return action
  }

  async get(id: string): Promise<Action> {
    const found = this.loaded.find(act => act.id === id)
    if (found) {
      return found
    }

    const act = await this.loadAction({ id: id })
    this.loaded.push(act)
    return act
  }

  async populateInitial() {
    const standard = [
      {
        id: '_shell/bash',
        name: 'Bash',
        description: 'Run a bash script'
      },
      {
        id: '_shell/python',
        name: 'Python',
        description: 'Run a Python script'
      }
    ]
    const recommended = [
      {
        id: 'actions/checkout@v2',
        name: 'Checkout',
        description: 'Run a git clone to get your code'
      },
      {
        id: 'actions/setup-node@v1',
        name: 'Setup Node.js',
        description: ''
      },
      {
        id: 'actions/setup-python@v2',
        name: 'Setup Python',
        description: ''
      }
    ]
    this.standard = await Promise.all(standard.map(this.loadAction, this))
    this.recommended = await Promise.all(recommended.map(this.loadAction, this))
    this.loaded.push(...this.standard)
    this.loaded.push(...this.recommended)
  }
}

export {
  Action,
  ActionContainer,
  ActionInput,
  ActionOutput
}