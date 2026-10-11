<script setup lang="ts">
import { ref, defineProps, useAttrs } from 'vue'

interface Props {
    name: string
}
const props = defineProps<Props>()

</script>

<template>
  <div>
    <input v-model="props.name" />
  </div>
</template>