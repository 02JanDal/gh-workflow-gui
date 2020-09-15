<template>
  <div class="vw-100 vh-100">
    <b-navbar toggleable="sm" type="dark" variant="info">
      <b-navbar-brand href="#">GH Workflow GUI</b-navbar-brand>
      <b-navbar-toggle target="navbar-collapse"></b-navbar-toggle>
      <b-collapse id="navbar-collapse" is-nav>
        <b-navbar-nav class="ml-auto">
          <b-nav-form>
            <b-button size="sm" class="my-2 my-sm-0" v-b-modal.result-modal>Show YAML</b-button>
            <b-button size="sm" class="my-2 my-sm-0" v-b-modal.add-modal>Add</b-button>
          </b-nav-form>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>

    <div class="w-100 h-100 overflow-scroll">
      <WorkflowCanvas v-if="$root.workflow"/>
    </div>

    <AddActionModal @added="(action) => $root.workflow.add(action)" />
    <b-modal id="result-modal" size="xl" title="Resulting YAML" hide-footer @show="generate">
      <highlight-code lang="yaml">{{ generated }}</highlight-code>
    </b-modal>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import WorkflowCanvas from "@/components/WorkflowCanvas.vue";
import AddActionModal from "@/components/AddActionModal.vue";

export default Vue.extend({
  name: 'App',
  components: { AddActionModal, WorkflowCanvas },
  data () {
    return {
      generated: ''
    }
  },
  methods: {
    generate () {
      this.generated = this.$root.workflow.generate()
    }
  }
});
</script>

<style>
  .overflow-scroll {
    overflow: scroll;
  }
</style>

