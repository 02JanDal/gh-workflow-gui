import Vue from 'vue'
import VueHighlightJS from 'vue-highlight.js'
import yaml from 'highlight.js/lib/languages/yaml'
import App from './App.vue'

import './registerServiceWorker'

import { BootstrapVue, BootstrapVueIcons } from 'bootstrap-vue'

import { Octokit } from '@octokit/rest';
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import 'highlight.js/styles/default.css'

import { ActionContainer } from "@/actions";
import { Workflow } from "@/workflow";
import { throttling } from "@octokit/plugin-throttling";

Vue.use(BootstrapVue)
Vue.use(BootstrapVueIcons)
Vue.use(VueHighlightJS, { languages: { yaml } })

Vue.config.productionTip = false

const MyOctokit = Octokit.plugin(throttling)

new Vue({
  render: h => h(App),
  data () {
    const octokit = new MyOctokit({
      auth: '------- YOUR AUTH TOKEN HERE -------',
      userAgent: 'gh-workflow-gui',
      throttle: {
        onRateLimit: (retryAfter: any, options: any, octokit: any) => {
          octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`)

          if (options.request.retryCount === 0) { // only retries once
            octokit.log.info(`Retrying after ${retryAfter} seconds!`)
            return true
          }
        },
        onAbuseLimit: (retryAfter: any, options: any, octokit: any) => {
          // does not retry, only logs a warning
          octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`)
        }
      }
    })
    const workflow = new Workflow()
    return {
      actions: new ActionContainer(octokit),
      workflow: workflow,
      workflowLoaded: false,
      octokit: octokit,
      saveBounceTimeout: null as NodeJS.Timeout | null
    }
  },
  watch: {
    workflow: {
      handler () {
        if (!this.workflowLoaded) {
          return
        }
        if (this.saveBounceTimeout) {
          clearTimeout(this.saveBounceTimeout)
        }
        this.saveBounceTimeout = setTimeout(() => this.workflow.save(), 1000)
      },
      deep: true
    }
  },
  async mounted() {
    await this.actions.populateInitial()
    await this.workflow.load(this.actions)
    this.workflowLoaded = true
  }
}).$mount('#app')
