import {describe, test, expect} from "vitest"
import {flushPromises} from "@vue/test-utils"
import {createRouter, createMemoryHistory} from "vue-router"
import KsBreadcrumbColumn from "./KsBreadcrumbColumn.vue"
import locales from "./KsBreadcrumb.locale"
import type {KsBreadcrumbItem, KsBreadcrumbLoader} from "./types"
import {i18nMount} from "../../../../tests/units/i18nMount"

const router = createRouter({
    history: createMemoryHistory(),
    routes: [{path: "/:path(.*)*", component: {template: "<div/>"}}],
})

const globalConfig = {plugins: [router]}

function createDeferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return {promise, resolve, reject}
}

describe("KsBreadcrumbColumn", () => {
    test("renders one row per entry and takes precedence over load", async () => {
        const entries: KsBreadcrumbItem[] = [
            {label: "Entry 1"},
            {label: "Entry 2"},
        ]
        const load: KsBreadcrumbLoader = async () => [{label: "Loaded Item"}]

        const wrapper = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {entries, load},
            global: globalConfig,
        })
        await flushPromises()

        const rows = wrapper.findAll("[data-testid=\"breadcrumb-entry\"]")
        expect(rows.length).toBe(2)
        expect(rows[0].text()).toContain("Entry 1")
        expect(rows[1].text()).toContain("Entry 2")
    })

    test("awaits load and renders its items", async () => {
        const deferred = createDeferred<KsBreadcrumbItem[]>()
        const load: KsBreadcrumbLoader = () => deferred.promise

        const wrapper = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {load},
            global: globalConfig,
        })

        expect(wrapper.findAll("[data-testid=\"breadcrumb-entry\"]").length).toBe(0)

        deferred.resolve([{label: "Item A"}, {label: "Item B"}])
        await flushPromises()

        const rows = wrapper.findAll("[data-testid=\"breadcrumb-entry\"]")
        expect(rows.length).toBe(2)
        expect(rows[0].text()).toContain("Item A")
        expect(rows[1].text()).toContain("Item B")
    })

    test("switching load clears previous rows before new ones arrive", async () => {
        const initialItems: KsBreadcrumbItem[] = [{label: "Old 1"}, {label: "Old 2"}]
        const firstLoader: KsBreadcrumbLoader = async () => initialItems

        const wrapper = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {load: firstLoader},
            global: globalConfig,
        })
        await flushPromises()

        expect(wrapper.findAll("[data-testid=\"breadcrumb-entry\"]").length).toBe(2)

        const secondDeferred = createDeferred<KsBreadcrumbItem[]>()
        const secondLoader: KsBreadcrumbLoader = () => secondDeferred.promise

        await wrapper.setProps({load: secondLoader})

        expect(wrapper.findAll("[data-testid=\"breadcrumb-entry\"]").length).toBe(0)

        secondDeferred.resolve([{label: "New 1"}])
        await flushPromises()

        const rows = wrapper.findAll("[data-testid=\"breadcrumb-entry\"]")
        expect(rows.length).toBe(1)
        expect(rows[0].text()).toContain("New 1")
    })

    test("discards a slow loader that resolves after a newer one has started", async () => {
        const slowDeferred = createDeferred<KsBreadcrumbItem[]>()
        const slowLoader: KsBreadcrumbLoader = () => slowDeferred.promise

        const wrapper = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {load: slowLoader},
            global: globalConfig,
        })

        const fastLoader: KsBreadcrumbLoader = async () => [{label: "Fast"}]
        await wrapper.setProps({load: fastLoader})
        await flushPromises()

        expect(wrapper.findAll("[data-testid=\"breadcrumb-entry\"]").map((el) => el.text().trim())).toEqual(["Fast"])

        slowDeferred.resolve([{label: "Stale Slow"}])
        await flushPromises()

        const rows = wrapper.findAll("[data-testid=\"breadcrumb-entry\"]")
        expect(rows.length).toBe(1)
        expect(rows[0].text()).toContain("Fast")
    })

    test("shows the empty message only once loading finishes with no rows", async () => {
        const deferred = createDeferred<KsBreadcrumbItem[]>()
        const load: KsBreadcrumbLoader = () => deferred.promise

        const wrapper = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {load},
            global: globalConfig,
        })

        expect(wrapper.find(".empty").exists()).toBe(false)

        deferred.resolve([])
        await flushPromises()

        const empty = wrapper.find(".empty")
        expect(empty.exists()).toBe(true)
        expect(empty.text()).toBe("Nothing here yet")
    })

    test("renders heading only when passed", async () => {
        const wrapperWithout = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {entries: [{label: "Item"}]},
            global: globalConfig,
        })
        expect(wrapperWithout.find(".heading").exists()).toBe(false)

        const wrapperWith = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {heading: "Namespaces", entries: [{label: "Item"}]},
            global: globalConfig,
        })
        const heading = wrapperWith.find(".heading")
        expect(heading.exists()).toBe(true)
        expect(heading.text()).toBe("Namespaces")
    })

    test("hovering a row with children opens nested flyout, and one without closes it", async () => {
        const childLoader: KsBreadcrumbLoader = async () => [{label: "Child 1"}]
        const entries: KsBreadcrumbItem[] = [
            {label: "With Children", children: childLoader},
            {label: "Without Children"},
        ]

        const wrapper = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {entries},
            global: globalConfig,
        })
        await flushPromises()

        const rows = wrapper.findAll("[data-testid=\"breadcrumb-entry\"]")
        expect(wrapper.find(".flyout").exists()).toBe(false)

        await rows[0].trigger("mouseenter")
        expect(wrapper.find(".flyout").exists()).toBe(true)

        await rows[1].trigger("mouseenter")
        expect(wrapper.find(".flyout").exists()).toBe(false)
    })

    test("clicking a row emits select with the entry, and nested flyout select bubbles up", async () => {
        const childItem: KsBreadcrumbItem = {label: "Sub-item"}
        const childLoader: KsBreadcrumbLoader = async () => [childItem]
        const parentItem: KsBreadcrumbItem = {label: "Parent", children: childLoader}
        const plainItem: KsBreadcrumbItem = {label: "Plain"}

        const wrapper = i18nMount(KsBreadcrumbColumn, {
            locales,
            props: {entries: [parentItem, plainItem]},
            global: globalConfig,
        })
        await flushPromises()

        const rows = wrapper.findAll("[data-testid=\"breadcrumb-entry\"]")

        await rows[1].trigger("click")
        expect(wrapper.emitted("select")).toBeTruthy()
        expect(wrapper.emitted("select")?.[0]).toEqual([plainItem])

        await rows[0].trigger("mouseenter")
        await flushPromises()

        const flyout = wrapper.findComponent(".flyout")
        expect(flyout.exists()).toBe(true)

        flyout.vm.$emit("select", childItem)
        expect(wrapper.emitted("select")?.[1]).toEqual([childItem])
    })
})
