<template>
    <g>
        <path stroke="white" fill="transparent" stroke-width="5" :d="path" />
        <path stroke="black" fill="transparent" :d="path" />
    </g>
</template>
<script lang="ts">
export default {
  name: 'ConnectionPath',
  props: {
    connection: {}
  },
  computed: {
    path () {
      const canvasRect = document.getElementById('canvas').getBoundingClientRect()
      const from = { x: this.connection.from.step.x, y: this.connection.from.step.y }
      const to = { x: this.connection.to.step.x, y: this.connection.to.step.y }

      const fromConnElement = document.getElementById(
        'connector_out_' + this.connection.from.step.id
        + (this.connection.from.output ? '_' + this.connection.from.output : ''))
      const toConnElement = document.getElementById(
        'connector_in_' + this.connection.to.step.id
        + (this.connection.to.input ? '_' + this.connection.to.input : ''))
      if (!fromConnElement || !toConnElement) {
        return null
      }

      const fromRect = fromConnElement.getBoundingClientRect()
      from.x = fromRect.right - fromRect.width/2 - canvasRect.left
      from.y = fromRect.top + fromRect.height/2 - canvasRect.top
      const toRect = toConnElement.getBoundingClientRect()
      to.x = toRect.right - toRect.width/2 - canvasRect.left
      to.y = toRect.top + toRect.height/2 - canvasRect.top

      let controlOffset = 100
      if (from.x < to.x) {
        controlOffset = Math.max(20, (to.x - from.x) * 2/3)
      } else {
        controlOffset = Math.max(from.x - to.x, 20)
      }

      return `M ${from.x} ${from.y} C ${from.x+controlOffset} ${from.y} ${to.x-controlOffset} ${to.y} ${to.x} ${to.y}`
    }
  }
}
</script>
