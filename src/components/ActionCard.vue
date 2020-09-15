<template>
    <b-card footer-class="d-flex">
        <b-card-title class="mb-1">
            {{ action.name }}
        </b-card-title>
        <div class="mb-2" v-if="action.stats">
            <b-badge class="mr-2">
                <b-icon-star-fill></b-icon-star-fill>
                {{ action.stats.stars }}
            </b-badge>
            <b-badge>
                <b-icon-bug-fill></b-icon-bug-fill>
                {{ action.stats.issues }}
            </b-badge>
        </div>
        <p>{{ action.description }}</p>
        <template v-slot:footer>
            <a :href="action.urls.repo" v-if="action.urls" class="py-1 px-2" target="_blank">
                <b-icon-info-circle></b-icon-info-circle>
            </a>
            <a :href="action.urls.marketplace" v-if="action.urls" class="py-1 px-2" target="_blank">
                <b-icon-basket2></b-icon-basket2>
            </a>
            <b-button size="sm" variant="success" class="ml-auto" @click="$emit('added', action)">Add</b-button>
        </template>
    </b-card>
</template>

<script lang="ts">
import { Action } from "@/actions";

export default {
  name: 'ActionCard',
  props: {
    action: { type: Action }
  }
}
</script>