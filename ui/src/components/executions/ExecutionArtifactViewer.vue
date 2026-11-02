<template>
    <section class="artifacts-viewer" data-test="execution-artifact-viewer">
        <header class="artifacts-viewer-header">
            <span class="artifacts-task-icon"><TaskIcon :cls="artifact.cls" :icons="pluginsStore.icons" :loadIcon="pluginsStore.loadIcon" onlyIcon /></span>
            <div>
                <KsText tag="strong">{{ artifact.title }}</KsText>
                <KsText size="small" type="secondary">{{ artifact.taskId }}</KsText>
            </div>
            <KsSegmented
                v-if="siblings.length > 1"
                :modelValue="artifact.key"
                class="artifacts-switch"
                variant="neutral"
                :options="siblingOptions"
                @update:modelValue="emit('select', String($event))"
            />
            <KsIconButton
                v-if="fullscreen !== undefined"
                :tooltip="fullscreenLabel"
                :aria-label="fullscreenLabel"
                :aria-pressed="fullscreen"
                filled
                data-test="execution-artifact-fullscreen"
                @click="emit('toggleFullscreen')"
            >
                <component :is="fullscreen ? FullscreenExit : Fullscreen" />
            </KsIconButton>
        </header>
        <div class="artifacts-viewer-body">
            <ExecutionArtifactView :artifact="artifact" :execution="execution" :taskRunId="taskRunId" />
        </div>
    </section>
</template>

<script setup lang="ts">
    import {computed} from "vue"
    import {useI18n} from "vue-i18n"
    import {KsIconButton, KsSegmented, KsText} from "@kestra-io/design-system"
    import Fullscreen from "vue-material-design-icons/Fullscreen.vue"
    import FullscreenExit from "vue-material-design-icons/FullscreenExit.vue"
    import TaskIcon from "../plugins/TaskIcon.vue"
    import ExecutionArtifactView from "./ExecutionArtifactView.vue"
    import {usePluginsStore} from "../../stores/plugins"
    import type {Execution} from "../../stores/executions"
    import type {ExecutionArtifact} from "./composables/useExecutionArtifacts"

    const props = withDefaults(defineProps<{
        artifact: ExecutionArtifact
        siblings: ExecutionArtifact[]
        execution?: Execution
        taskRunId?: string
        fullscreen?: boolean
    }>(), {
        execution: undefined,
        taskRunId: undefined,
        fullscreen: undefined,
    })

    const emit = defineEmits<{
        select: [key: string]
        toggleFullscreen: []
    }>()

    const {t} = useI18n()
    const pluginsStore = usePluginsStore()
    pluginsStore.fetchIcons()

    const siblingOptions = computed(() => props.siblings.map((sibling) => ({label: sibling.title, value: sibling.key})))
    const fullscreenLabel = computed(() => t(props.fullscreen ? "execution_artifacts.exit_fullscreen" : "execution_artifacts.fullscreen"))
</script>

<style scoped>
    .artifacts-task-icon {
        flex: 0 0 auto;
        width: 1.75rem;
        height: 1.75rem;
    }

    .artifacts-switch {
        margin-left: auto;
    }

    .artifacts-viewer {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--ks-bg-surface);
        border: 1px solid var(--ks-border-default);
        border-radius: var(--ks-radius-base);
    }

    .artifacts-viewer-header {
        display: flex;
        align-items: center;
        gap: var(--ks-spacing-3);
        padding: var(--ks-spacing-3) var(--ks-spacing-4);
        border-bottom: 1px solid var(--ks-border-default);

        & > div {
            display: flex;
            flex-direction: column;
        }
    }

    .artifacts-viewer-body {
        flex: 1;
        min-height: 0;
        overflow: auto;
    }
</style>
