<template>
    <div :style="{ position: 'relative', width: width + 'px', height: height + 'px' }"
         :class="{ connecting: editedConnection }"
         id="canvas"
         ref="canvas"
         @mousemove="mouseMove">
        <div v-for="step in this.$root.workflow.steps" :key="step.id"
             class="step" :class="{ dragging: dragging === step, selected: false }"
             :id="'step-' + step.id"
             :data-step-id="step.id"
             :style="{ top: step.y + 'px', left: step.x + 'px' }">
            <div class="step-top border border-info rounded w-100 py-2 px-3 bg-info text-light"
                 @mousedown.stop="mouseDownStep($event, step)">
                <div class="connector-input bg-white border-info"
                     :id="'connector_in_' + step.id"
                     :class="{ highlight: editedConnection && editedConnection.to.step === step && !editedConnection.to.input }"
                     @mousedown.stop="mouseDownConnector($event, step, 'input', null)"></div>
                <div class="d-flex justify-content-between align-items-center">
                    <div>{{ step.name }}</div>
                    <b-dropdown size="sm" variant="outline-info" toggle-class="bg-white" no-caret>
                        <template v-slot:button-content>
                            <b-icon-gear></b-icon-gear>
                        </template>
                        <b-dropdown-item-button @click.stop="edit(step)" v-if="step.action.id.startsWith('_shell/')">
                            <b-icon-pencil></b-icon-pencil> Edit
                        </b-dropdown-item-button>
                        <b-dropdown-item-button @click.stop="addEnv(step, '')">
                            <b-icon-plus></b-icon-plus> Add ENV
                        </b-dropdown-item-button>
                        <b-dropdown-divider></b-dropdown-divider>
                        <b-dropdown-item-button @click.stop="remove(step)">
                            <b-icon-trash></b-icon-trash> Delete
                        </b-dropdown-item-button>
                    </b-dropdown>
                </div>
                <div class="connector-output bg-white border-info"
                     :id="'connector_out_' + step.id"
                     :class="{ highlight: editedConnection && editedConnection.from.step === step && !editedConnection.from.output }"
                     @mousedown.stop="mouseDownConnector($event, step, 'output', null)"></div>
            </div>
            <div class="step-ports">
                <div v-for="input in step.inputs" :key="step.id + '-input-' + input.type + '-' + input.id"
                     class="step-input border border-secondary px-3 mx-3"
                     :data-port-id="input.id">
                    <div class="connector-input bg-white border-secondary"
                         :id="'connector_in_' + step.id + '_' + input.id"
                         :class="{ highlight: editedConnection && editedConnection.to.step === step && editedConnection.to.input === input.id }"
                         @mousedown.stop="mouseDownConnector($event, step, 'input', input.id)"></div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div v-b-tooltip.hover.right
                             :title="(getInput(input, step.action.inputs) || { description: '' } ).description">{{ input.id }}</div>
                        <b-button-group size="xs" class="my-1" v-if="input.type === 'env-custom'">
                            <b-button @click.stop="removeEnv(step, input.id)" variant="danger"><b-icon-trash></b-icon-trash></b-button>
                            <b-button @click.stop="editEnv(step, input)" variant="dark"><b-icon-pencil></b-icon-pencil></b-button>
                        </b-button-group>
                    </div>
                </div>
                <div v-for="output in step.outputs" :key="step.id + '-output-' + output.type + '-' + output.id"
                     class="step-output border border-secondary px-3 mx-3"
                     :data-port-id="output.id">
                    {{ output.id }}
                    <div class="connector-output bg-white border-secondary"
                         :id="'connector_out_' + step.id + '_' + output.id"
                         :class="{ highlight: editedConnection && editedConnection.from.step === step && editedConnection.from.output === output.id }"
                         @mousedown.stop="mouseDownConnector($event, step, 'output', output.id)"></div>
                </div>
            </div>
        </div>

        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <path v-if="editedConnection"
                  :d="editedConnectionPath"
                  stroke="black" fill="transparent" />
            <ConnectionPath v-for="c in workflow.connections"
                            :key="connectionKey(c)"
                            @click.native="clickOnConnection($event, c)"
                            :connection="c" />
        </svg>

        <b-button variant="danger" ref="deleteBtn" style="position:fixed"
                  v-show="clickedConnection"
                  @click="deleteConnection">
            <b-icon-trash></b-icon-trash>
        </b-button>

        <b-modal ref="env-name-modal" title="Enter name for Environment variable"
                 @ok="editedInput ? editEnv(editedStep, editedInput, editedEnvironmentVariable) : addEnv(editedStep, editedEnvironmentVariable)"
                 :ok-disabled="editedEnvironmentVariable.length === 0">
            <b-input type="text" v-model="editedEnvironmentVariable" />
        </b-modal>
        <b-modal ref="edit-step-modal" title="Edit" @ok="stepRunUpdated(editedStep)">
            <b-form-group v-if="editedStep && editedStep.action.id.startsWith('_shell/')">
                <label for="step-run-textarea">Run:</label>
                <b-form-textarea id="step-run-textarea" v-model="editedStep.run" placeholder="Your code here..." rows="10" />
            </b-form-group>
        </b-modal>
    </div>
</template>

<script lang="ts">
import {Step, Workflow} from "@/workflow";
import {ActionInput, ActionOutput} from "@/actions";
import ConnectionPath from "@/components/ConnectionPath.vue";

export default {
  name: 'WorkflowCanvas',
  components: {ConnectionPath},
  data () {
    return {
      dragging: null,
      editedEnvironmentVariable: '',
      editedStep: null,
      editedInput: null,
      editedConnection: null,
      clickedConnection: null
    }
  },
  computed: {
    width (): number {
      if (this.workflow.steps.length === 0) {
        return 256
      }
      return Math.max(...this.workflow.steps.map((step: Step) => step.x)) + 256
    },
    height (): number {
      if (this.workflow.steps.length === 0) {
        return 256
      }
      return Math.max(...this.workflow.steps.map((step: Step) => step.y)) + 256
    },
    workflow (): Workflow {
      return this.$root.workflow
    },
    editedConnectionPath (): string {
      const from = this.editedConnection.from
      const to = this.editedConnection.to
      let controlOffset = 100
      if (from.x < to.x) {
        controlOffset = Math.max(20, (to.x - from.x) * 2/3)
      } else {
        controlOffset = Math.max(from.x - to.x, 20)
      }
      return `M ${from.x} ${from.y} C ${from.x+controlOffset} ${from.y} ${to.x-controlOffset} ${to.y} ${to.x} ${to.y}`
    }
  },
  mounted () {
    window.addEventListener('mouseup', this.mouseUp)
  },
  methods: {
    stepRunUpdated (step: Step) {
      console.warn(step)
      if (step.run) {
        const outputs = [...step.run.matchAll(/::set-output name=([^:]+)::/g)].map(m => m[1])
        step.outputs = step.outputs.filter(o => o.type !== 'custom' || outputs.includes(o.id))
        for (const output of outputs) {
          const existing = step.outputs.find(o => o.type === 'custom' && o.id === output)
          if (!existing) {
            step.outputs.push({ type: 'custom', id: output })
          }
        }
      }
    },
    mouseMove (event: MouseEvent) {
      if (this.dragging) {
        this.dragging.x += event.movementX
        this.dragging.y += event.movementY
      } else if (this.editedConnection) {
        const canvasElement = this.$refs.canvas
        const x = event.clientX
        const y = event.clientY - canvasElement.offsetTop
        if (this.editedConnection.root === 'from') {
          this.editedConnection.to.x = x
          this.editedConnection.to.y = y
        } else {
          this.editedConnection.from.x = x
          this.editedConnection.from.y = y
        }

        const elements = document.elementsFromPoint(event.clientX, event.clientY)
        let
          stepId: string | null = null,
          portId: string | null = null
        for (const el of elements) {
          if (el.classList.contains('step-top') && !(this.editedConnection.root === 'from' ? this.editedConnection.from.output : this.editedConnection.to.input)) {
            stepId = el.parentElement.getAttribute('data-step-id')
            portId = null
            break
          } else if (
            (el.classList.contains('step-input') && this.editedConnection.root === 'from' && this.editedConnection.from.output) ||
            (el.classList.contains('step-output') && this.editedConnection.root === 'to' && this.editedConnection.to.input)) {
            stepId = el.parentElement.parentElement.getAttribute('data-step-id')
            portId = el.getAttribute('data-port-id')
            break
          } else if (
            (el.classList.contains('connector-input') && this.editedConnection.root === 'from') ||
            (el.classList.contains('connector-output') && this.editedConnection.root === 'to')) {
            if (el.parentElement.classList.contains('step-top') && ((this.editedConnection.root === 'from' && !this.editedConnection.from.output) || (this.editedConnection.root === 'to' && !this.editedConnection.to.input))) {
              stepId = el.parentElement.parentElement.getAttribute('data-step-id')
              portId = null
              break
            } else if ((this.editedConnection.root === 'from' && this.editedConnection.from.output) || (this.editedConnection.root === 'to' && this.editedConnection.to.input)) {
              stepId = el.parentElement.parentElement.parentElement.getAttribute('data-step-id')
              portId = el.parentElement.getAttribute('data-port-id')
              break
            }
          }
        }
        if (stepId) {
          const step = this.workflow.steps.find((s: Step) => s.id === stepId)
          if (this.editedConnection.root === 'from') {
            this.editedConnection.to.step = step
            this.editedConnection.to.input = portId
          } else {
            this.editedConnection.from.step = step
            this.editedConnection.from.output = portId
          }
        } else {
          if (this.editedConnection.root === 'from') {
            this.editedConnection.to.step = null
            this.editedConnection.to.input = null
          } else {
            this.editedConnection.from.step = null
            this.editedConnection.from.output = null
          }
        }
      }
    },
    mouseDownStep (event: MouseEvent, step: Step) {
      this.dragging = step
    },
    mouseDownConnector (event: MouseEvent, step: Step, direction: string, id: string | null) {
      const connectorElement = event.target as HTMLElement | null
      if (!connectorElement || !connectorElement.parentElement || !connectorElement.parentElement.parentElement) {
        return
      }
      const canvasElement = this.$refs.canvas

      const connectorRect = connectorElement.getBoundingClientRect()
      const canvasRect = canvasElement.getBoundingClientRect()

      const x = connectorRect.x - canvasRect.x + connectorElement.offsetWidth/2 + 1
      const y = connectorRect.y - canvasRect.y + connectorElement.offsetHeight/2 + 1
      if (direction === 'input') {
        this.editedConnection = {
          root: 'to',
          from: { step: null, output: null, x: event.clientX, y: event.clientY - canvasElement.offsetTop },
          to: { step: step, input: id, x: x, y: y }
        }
      } else {
        this.editedConnection = {
          root: 'from',
          from: { step: step, output: id, x: x, y: y },
          to: { step: null, input: null, x: event.clientX, y: event.clientY - canvasElement.offsetTop }
        }
      }
    },
    mouseUp (event: MouseEvent) {
      if (this.editedConnection && this.editedConnection.from.step && this.editedConnection.to.step) {
        delete this.editedConnection.from.x
        delete this.editedConnection.from.y
        delete this.editedConnection.to.x
        delete this.editedConnection.to.y
        this.workflow.connections.push(this.editedConnection)
      }
      this.dragging = null
      this.editedConnection = null
    },
    remove (step: Step) {
      this.workflow.remove(step)
    },
    addEnv (step: Step, name: string) {
        if (!name) {
          this.editedEnvironmentVariable = ''
          this.editedStep = step
          this.editedInput = null
          this.$refs['env-name-modal'].show()
        } else {
          step.inputs.push({ id: name, type: 'env-custom' })
        }
    },
    removeEnv (step: Step, id: string) {
      const index = step.inputs.findIndex(
        (i: { id: string; type: string }) => i.id === id && i.type === 'env-custom')
      if (index > -1) {
        step.inputs.splice(index, 1)
      }
    },
    editEnv (step: Step, input: { id: string; type: string }, newId: string) {
      if (!newId) {
        this.editedStep = step
        this.editedInput = input
        this.editedEnvironmentVariable = input.id
        this.$refs['env-name-modal'].show()
      } else {
        input.id = newId
      }
    },
    getInput (input: { id: string; type: string }, inputs: ActionInput[]): ActionInput | null {
      if (!inputs) {
        return null
      }
      const port = inputs.find((i: ActionInput) => i.id === input.id && i.type === input.type)
      if (port) {
        return port
      } else {
        return null
      }
    },
    getOutput (output: { id: string; type: string }, outputs: ActionOutput[]): ActionOutput | null {
      if (!outputs) {
        return null
      }
      const port = outputs.find((o: ActionOutput) => o.id === output.id && o.type === output.type)
      if (port) {
        return port
      } else {
        return null
      }
    },
    connectionKey (c: never) {
      return `${c.from.step.id}-${c.from.output}-${c.to.step.id}-${c.to.input}`
    },
    clickOnConnection (event: MouseEvent, c: never) {
      this.clickedConnection = c
      const btn = this.$refs.deleteBtn
      btn.style.left = event.clientX + 'px'
      btn.style.top = event.clientY + 'px'
    },
    deleteConnection () {
      const index = this.workflow.connections.indexOf(this.clickedConnection)
      this.workflow.connections.splice(index, 1)
      this.clickedConnection = null
    },
    edit (step: Step) {
      this.editedStep = step
      this.$refs['edit-step-modal'].show()
    }
  }
}
</script>

<style lang="scss">
    #canvas {
        min-width: 100vw;
        min-height: 100vh;

        &.connecting {
            cursor: crosshair;
        }
    }

    .step {
        position: absolute;
        width: 256px;
        user-select: none;

        .connector-input, .connector-output {
            width: 10px;
            height: 10px;
            background-color: black;
            border-radius: 5px;
            border: 2px solid black;
            position: absolute;
            top: calc(50% - 5px);
            cursor: crosshair;

            &.connector-input {
                left: -5px;
            }
            &.connector-output {
                right: -5px;
            }

            &.highlight {
                border-color: red !important;
                background-color: indianred !important;
            }
        }

        .step-top {
            cursor: grab;
            position: relative;
            border-width: 2px !important;

            .connector-output, .connector-input {
                width: 15px;
                height: 15px;
                border-radius: 7.5px;
                top: calc(50% - 7.5px);

                &.connector-input {
                    left: -8.5px;
                }
                &.connector-output {
                    right: -8.5px;
                }
            }
        }

        &.dragging .step-top {
            cursor: grabbing;
        }
        &.selected .step-top {
            border-style: dashed !important;
            background-color: white !important;
            color: black !important;
        }

        &.selected .step-ports > div {
            border-style: dashed !important;
        }

        .step-ports {
            > div {
                border-top-width: 0 !important;
                background-color: #e8e8e8;
                position: relative;

                &:last-of-type {
                    border-bottom-left-radius: 5px;
                    border-bottom-right-radius: 5px;
                }

                &.step-output {
                    text-align: right;
                }
            }
        }
    }

    .btn-xs, .btn-group-xs > .btn {
        padding: 0.1rem 0.25rem;
        font-size: 0.75rem;
        line-height: 1.5;
        border-radius: 0.2rem;
    }
</style>
