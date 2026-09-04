import { reactive, computed } from 'vue';

/**
 * Subscription tier for the Crop Intelligence module.
 *
 * This is a PRODUCT PREVIEW, not a billing system. AgriSphere has no payment
 * integration, so nothing here charges anyone or verifies an entitlement — it
 * only shapes which parts of the module the UI offers, so the tiering can be
 * demonstrated and evaluated. The UI says so plainly wherever the switch is
 * shown, because pretending a paywall is real would be dishonest.
 *
 * When real billing is added, the only change needed is to replace readStored()
 * with the entitlement returned by the server for the signed-in user. Every
 * gate in the app already asks this store rather than checking a flag inline.
 */

const STORAGE_KEY = 'agrisphere-plan-preview';

export const PLANS = {
  free: 'free',
  pro: 'pro',
};

/** Capabilities each tier unlocks. Gates reference these, never the tier name. */
const CAPABILITIES = {
  free: ['advisory', 'simpleView', 'detailedView', 'outlook', 'indicators', 'stageGuide'],
  pro: [
    'advisory',
    'simpleView',
    'detailedView',
    'outlook',
    'indicators',
    'stageGuide',
    'history',
    'watchlist',
    'pdfReport',
  ],
};

function readStored() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === PLANS.pro ? PLANS.pro : PLANS.free;
}

export const planState = reactive({
  tier: readStored(),
});

export const currentPlan = computed(() => planState.tier);
export const isPro = computed(() => planState.tier === PLANS.pro);

/** The single question every gated feature should ask. */
export function can(capability) {
  return (CAPABILITIES[planState.tier] || CAPABILITIES.free).includes(capability);
}

export function setPlan(tier) {
  planState.tier = tier === PLANS.pro ? PLANS.pro : PLANS.free;
  localStorage.setItem(STORAGE_KEY, planState.tier);
}

export function togglePlanPreview() {
  setPlan(planState.tier === PLANS.pro ? PLANS.free : PLANS.pro);
}
