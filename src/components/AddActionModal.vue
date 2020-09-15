<template>
    <b-modal id="add-modal" title="Add Action" size="xl" scrollable ok-title="Close"
             header-class="pb-0 px-0 border-bottom-0" ok-only ok-variant="secondary">
        <template v-slot:modal-header>
            <b-nav tabs align="center" class="w-100">
                <b-nav-item :active="currentTab === 'standard'" @click="currentTab = 'standard'">Standard</b-nav-item>
                <b-nav-item :active="currentTab === 'recommended'" @click="currentTab = 'recommended'">Recommended</b-nav-item>
                <b-nav-item :active="currentTab === 'search'" @click="currentTab = 'search'">Search</b-nav-item>
            </b-nav>
        </template>
        <template v-slot="{ ok }">
            <template v-if="currentTab === 'standard'">
                <b-row class="mb-n4">
                    <b-col sm="6" md="6" lg="4" xl="3" class="mb-4"
                           v-for="action in $root.actions.standard" :key="action.id">
                        <ActionCard :action="action" class="h-100" @added="added(action, ok)" />
                    </b-col>
                </b-row>
            </template>
            <template v-else-if="currentTab === 'recommended'">
                <b-row class="mb-n4">
                    <b-col sm="6" md="6" lg="4" xl="3" class="mb-4"
                           v-for="action in $root.actions.recommended" :key="action.id">
                        <ActionCard :action="action" class="h-100" @added="added(action, ok)" />
                    </b-col>
                </b-row>
            </template>
            <template v-else-if="currentTab === 'search'">
                <b-form-input type="search" placeholder="Search..." class="mb-4" v-model="searchTerms"></b-form-input>
                <div class="d-flex justify-content-center w-100" v-if="loading">
                    <b-spinner variant="secondary"></b-spinner>
                </div>
                <b-row class="mb-n4" v-else-if="searchResults.length > 0">
                    <b-col sm="6" md="6" lg="4" xl="3" class="mb-4"
                           v-for="action in searchResults" :key="'search_' + action.id">
                        <ActionCard :action="action" class="h-100" @added="added(action, ok)" />
                    </b-col>
                </b-row>
                <b-alert variant="info" show v-else>
                    No results
                </b-alert>
            </template>
        </template>
    </b-modal>
</template>

<script lang="ts">
import ActionCard from "@/components/ActionCard.vue";
import { Action } from "@/actions";
import {OctokitResponse} from "@octokit/types/dist-types/OctokitResponse";
import {SearchCodeResponseData} from "@octokit/types/dist-types/generated/Endpoints";

export default {
  name: 'AddActionModal',
  components: { ActionCard },
  data () {
    return {
      currentTab: 'standard',
      searchResultsRaw: [] as Action[],
      loading: false,
      searchTerms: '',
      searchBounceTimeout: null
    }
  },
  computed: {
    searchResults (): Action[] {
      const raw = this.searchResultsRaw
      const loaded = this.$root.actions.loaded
      const items = raw.length > 0 ? raw : loaded
      return [...items].sort((a: Action, b: Action) => a.name.localeCompare(b.name))
    }
  },
  watch: {
    searchTerms (search: string) {
      if (this.searchBounceTimeout) {
        clearTimeout(this.searchBounceTimeout)
      }
      this.searchBounceTimeout = setTimeout(() => this.search(), 1000)
    }
  },
  methods: {
    added (action: Action, ok: never) {
      this.$emit('added', action)
      ok()
    },
    async search () {
      if (this.searchTerms.trim() === '') {
        this.searchResultsRaw = []
      } else {
        this.loading = true
        const result: OctokitResponse<SearchCodeResponseData> =
          await this.$root.octokit.search.code({ q: 'filename:action language:yaml path:/ ' + this.searchTerms.trim() })
        this.searchResultsRaw = (await Promise.all(result.data.items.map((result) => {
          return this.$root.actions.get(result.repository.full_name)
        }))).filter((a: Action) => a.name)
        this.loading = false
      }
    }
  }
}
</script>