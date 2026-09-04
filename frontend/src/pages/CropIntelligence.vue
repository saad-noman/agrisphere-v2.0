<template>
  <div class="ci-page container">
    <!-- ── Page header ─────────────────────────────────────────────── -->
    <header class="ci-header">
      <div class="ci-header-text">
        <h1>{{ t('intel.title') }}</h1>
        <p class="ci-subtitle">{{ t('intel.subtitle') }}</p>
      </div>

      <div class="ci-header-aside">
        <span class="ci-plan-chip" :class="{ 'ci-plan-chip-pro': isPro }">
          {{ t('intel.plan.currentPlan', { plan: isPro ? t('intel.plan.pro') : t('intel.plan.free') }) }}
        </span>
        <button type="button" class="btn-pill-outline btn-pill-sm" @click="togglePlanPreview">
          {{ isPro ? t('intel.plan.backToFree') : t('intel.plan.tryPro') }}
        </button>
      </div>
    </header>

    <p class="ci-plan-note">{{ t('intel.plan.previewNote') }}</p>

    <!-- ── Tabs ────────────────────────────────────────────────────── -->
    <div class="ci-tabs" role="tablist" :aria-label="t('intel.shortTitle')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="ci-tab"
        :class="{ 'ci-tab-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tab.locked" class="ci-pro-tag">{{ t('intel.plan.proBadge') }}</span>
      </button>
    </div>

    <!-- ══ ADVISORY TAB ═══════════════════════════════════════════════ -->
    <div v-show="activeTab === 'advisory'" role="tabpanel">
      <!-- Setup form -->
      <section class="ci-card ci-setup" aria-labelledby="ci-setup-title">
        <div class="ci-card-head">
          <h2 id="ci-setup-title">{{ t('intel.setup.title') }}</h2>
          <p>{{ t('intel.setup.description') }}</p>
        </div>

        <form class="ci-form" novalidate @submit.prevent="handleGenerate">
          <div class="ci-field">
            <label class="form-label" for="ci-division">{{ t('intel.setup.division') }}</label>
            <select
              id="ci-division"
              v-model="form.divisionId"
              class="form-select"
              :aria-invalid="!!errors.divisionId"
              :aria-describedby="errors.divisionId ? 'ci-division-err' : undefined"
              @change="onDivisionChange"
            >
              <option value="">{{ t('intel.setup.chooseDivision') }}</option>
              <option v-for="d in divisions" :key="d.id" :value="d.id">{{ tf(d.name) }}</option>
            </select>
            <p v-if="errors.divisionId" id="ci-division-err" class="ci-error">{{ errors.divisionId }}</p>
          </div>

          <div class="ci-field">
            <label class="form-label" for="ci-district">{{ t('intel.setup.district') }}</label>
            <select
              id="ci-district"
              v-model="form.districtId"
              class="form-select"
              :disabled="!form.divisionId"
              :aria-invalid="!!errors.districtId"
              :aria-describedby="errors.districtId ? 'ci-district-err' : 'ci-district-help'"
              @change="onDistrictChange"
            >
              <option value="">
                {{ form.divisionId ? t('intel.setup.chooseDistrict') : t('intel.setup.selectDivisionFirst') }}
              </option>
              <option v-for="d in districts" :key="d.id" :value="d.id">{{ tf(d.name) }}</option>
            </select>
            <p v-if="errors.districtId" id="ci-district-err" class="ci-error">{{ errors.districtId }}</p>
            <p v-else id="ci-district-help" class="ci-help">{{ t('intel.provenance.weatherSource') }}</p>
          </div>

          <div class="ci-field">
            <label class="form-label" for="ci-upazila">{{ t('intel.setup.upazilaOptional') }}</label>
            <select id="ci-upazila" v-model="form.upazilaId" class="form-select" :disabled="!upazilas.length">
              <option value="">
                {{ form.districtId ? t('intel.setup.chooseUpazila') : t('intel.setup.selectDistrictFirst') }}
              </option>
              <option v-for="u in upazilas" :key="u.id" :value="u.id">{{ tf(u.name) }}</option>
            </select>
          </div>

          <div class="ci-field">
            <label class="form-label" for="ci-crop">{{ t('intel.setup.crop') }}</label>
            <select
              id="ci-crop"
              v-model="form.cropId"
              class="form-select"
              :aria-invalid="!!errors.cropId"
              :aria-describedby="errors.cropId ? 'ci-crop-err' : 'ci-crop-help'"
            >
              <option value="">{{ t('intel.setup.chooseCrop') }}</option>
              <option v-for="c in crops" :key="c.id" :value="c.id">{{ tf(c.name) }}</option>
            </select>
            <p v-if="errors.cropId" id="ci-crop-err" class="ci-error">{{ errors.cropId }}</p>
            <p v-else-if="selectedCrop" id="ci-crop-help" class="ci-help">{{ tf(selectedCrop.season) }}</p>
          </div>

          <div class="ci-field">
            <label class="form-label" for="ci-sowing">{{ t('intel.setup.sowingDate') }}</label>
            <input
              id="ci-sowing"
              v-model="form.sowingDate"
              type="date"
              class="form-control"
              :max="todayIso"
              :min="twoYearsAgoIso"
              :aria-invalid="!!errors.sowingDate"
              :aria-describedby="errors.sowingDate ? 'ci-sowing-err' : 'ci-sowing-help'"
            />
            <p v-if="errors.sowingDate" id="ci-sowing-err" class="ci-error">{{ errors.sowingDate }}</p>
            <p v-else id="ci-sowing-help" class="ci-help">{{ t('intel.setup.sowingHelp') }}</p>
          </div>

          <div class="ci-field ci-field-split">
            <div>
              <label class="form-label" for="ci-area">
                {{ t('intel.setup.area') }} <span class="ci-optional">({{ t('common.optional') }})</span>
              </label>
              <input id="ci-area" v-model.number="form.areaValue" type="number" min="0" step="0.1" class="form-control" />
            </div>
            <div>
              <label class="form-label" for="ci-area-unit">{{ t('intel.setup.areaUnit') }}</label>
              <select id="ci-area-unit" v-model="form.areaUnit" class="form-select">
                <option value="bigha">{{ t('units.bigha') }}</option>
                <option value="decimal">{{ t('units.decimal') }}</option>
                <option value="acre">{{ t('units.acre') }}</option>
                <option value="hectare">{{ t('units.hectare') }}</option>
              </select>
            </div>
          </div>

          <div class="ci-form-actions">
            <button type="submit" class="btn-pill" :disabled="loading">
              {{ loading ? t('intel.setup.generating') : t('intel.setup.generate') }}
            </button>
          </div>
        </form>
      </section>

      <!-- Loading -->
      <div v-if="loading" class="ci-card ci-skeleton-card" aria-busy="true" :aria-label="t('a11y.loading')">
        <div class="ci-skeleton ci-skeleton-lg"></div>
        <div class="ci-skeleton"></div>
        <div class="ci-skeleton ci-skeleton-sm"></div>
      </div>

      <!-- Error -->
      <div v-else-if="loadError" class="ci-card ci-state ci-state-error" role="alert">
        <h3>{{ t('states.errorTitle') }}</h3>
        <p>{{ loadError }}</p>
        <button type="button" class="btn-pill-outline btn-pill-sm" @click="handleGenerate">
          {{ t('common.retry') }}
        </button>
      </div>

      <!-- Result -->
      <template v-else-if="advisory">
        <!-- Data provenance: always visible, never buried -->
        <div class="ci-provenance" :class="`ci-provenance-${advisory.dataMode}`" role="note">
          <span class="ci-provenance-badge">
            {{ advisory.dataMode === 'demo' ? t('intel.provenance.demoData')
              : advisory.dataMode === 'cached' ? t('intel.provenance.cachedData')
              : t('intel.provenance.liveData') }}
          </span>
          <span v-if="advisory.dataMode === 'demo'">{{ t('intel.provenance.demoBody') }}</span>
          <span v-else>{{ t('intel.summary.generatedAt', { time: d(advisory.generatedAt, dateTimeFormat) }) }}</span>
        </div>

        <!-- Headline status -->
        <section class="ci-card ci-status" :class="`ci-status-${advisory.status}`">
          <div class="ci-status-main">
            <span class="ci-status-icon" aria-hidden="true" v-html="statusIcon"></span>
            <div>
              <p class="ci-status-context">
                {{ t('intel.summary.forCrop', { crop: tf(advisory.crop.name), location: tf(advisory.location.label) }) }}
              </p>
              <h2 class="ci-status-title">{{ t(`intel.status.${advisory.status}`) }}</h2>
              <p class="ci-status-body">{{ t(`intel.status.${advisory.status}Body`) }}</p>
            </div>
          </div>

          <dl class="ci-status-facts">
            <div>
              <dt>{{ t('intel.summary.stage') }}</dt>
              <dd>{{ tf(advisory.stage.name) }}</dd>
            </div>
            <div>
              <dt>{{ t('intel.summary.daysLabel') }}</dt>
              <dd>{{ n(advisory.field.daysAfterSowing) }}</dd>
            </div>
            <div>
              <dt>{{ t('intel.summary.nextRain') }}</dt>
              <dd>{{ advisory.nextRainDate ? d(advisory.nextRainDate) : t('common.none') }}</dd>
            </div>
          </dl>

          <p class="ci-status-actions">
            {{ advisory.actionCount
              ? t('intel.summary.actionsNeeded', { count: n(advisory.actionCount) })
              : t('intel.summary.noActionsNeeded') }}
          </p>
        </section>

        <!-- Simple / Detailed switch -->
        <div class="ci-view-switch">
          <span class="ci-view-label" id="ci-view-label">{{ t('intel.view.toggleLabel') }}</span>
          <div class="ci-segmented" role="group" aria-labelledby="ci-view-label">
            <button
              type="button"
              class="ci-seg-btn"
              :class="{ 'ci-seg-active': view === 'simple' }"
              :aria-pressed="view === 'simple'"
              @click="view = 'simple'"
            >{{ t('intel.view.simple') }}</button>
            <button
              type="button"
              class="ci-seg-btn"
              :class="{ 'ci-seg-active': view === 'detailed' }"
              :aria-pressed="view === 'detailed'"
              @click="view = 'detailed'"
            >{{ t('intel.view.detailed') }}</button>
          </div>
          <span class="ci-view-hint">
            {{ view === 'simple' ? t('intel.view.simpleHint') : t('intel.view.detailedHint') }}
          </span>
        </div>

        <!-- Risks -->
        <section class="ci-risks" aria-labelledby="ci-risks-title">
          <h2 id="ci-risks-title" class="ci-section-title">{{ t('intel.risk.whatToDo') }}</h2>

          <div v-if="!advisory.risks.length" class="ci-card ci-state ci-state-ok">
            <h3>{{ t('intel.risk.noRisks') }}</h3>
            <p>{{ t('intel.risk.noRisksBody') }}</p>
            <p class="ci-stage-tip">{{ tf(advisory.stage.actions) }}</p>
          </div>

          <article
            v-for="risk in advisory.risks"
            :key="risk.id"
            class="ci-card ci-risk"
            :class="`ci-risk-${risk.severity}`"
          >
            <header class="ci-risk-head">
              <div class="ci-risk-head-main">
                <span class="ci-risk-icon" aria-hidden="true" v-html="categoryIcon(risk.category)"></span>
                <div>
                  <h3 class="ci-risk-title">
                    {{ risk.subject ? tf(risk.subject) : t(`intel.risk.categories.${risk.category}`) }}
                  </h3>
                  <p class="ci-risk-category">{{ t(`intel.risk.categories.${risk.category}`) }}</p>
                </div>
              </div>
              <!-- Severity uses a word and a shape, not just colour -->
              <span class="ci-severity" :class="`ci-severity-${risk.severity}`">
                <span class="ci-severity-dots" aria-hidden="true">
                  <i v-for="i in severityDots(risk.severity)" :key="i"></i>
                </span>
                {{ t(`intel.severity.${risk.severity}`) }}
              </span>
            </header>

            <div class="ci-risk-block">
              <p class="ci-risk-label">{{ t('intel.risk.whatsHappening') }}</p>
              <p>{{ tf(risk.whatsHappening) }}</p>
            </div>

            <div class="ci-risk-block">
              <p class="ci-risk-label">{{ t('intel.risk.whyItMatters') }}</p>
              <p>{{ tf(risk.whyItMatters) }}</p>
            </div>

            <div class="ci-risk-block">
              <p class="ci-risk-label">{{ t('intel.risk.whatToDo') }}</p>
              <ul class="ci-action-list">
                <li v-for="(action, i) in risk.actions" :key="i">{{ tf(action) }}</li>
              </ul>
            </div>

            <footer class="ci-risk-foot">
              <span class="ci-when">
                <strong>{{ t('intel.risk.whenToAct') }}:</strong> {{ whenLabel(risk.when) }}
              </span>
              <span v-if="view === 'detailed'" class="ci-confidence">
                {{ t('intel.risk.confidence') }}: {{ t(`intel.severity.${risk.confidence}`) }}
              </span>
            </footer>

            <!-- Evidence only in detailed view — keeps the simple view calm -->
            <div v-if="view === 'detailed' && risk.evidence?.length" class="ci-evidence">
              <p class="ci-risk-label">{{ t('intel.risk.basedOn') }}</p>
              <ul class="ci-evidence-list">
                <li v-for="(ev, i) in risk.evidence" :key="i">
                  <span class="ci-ev-label">{{ tf(ev.label) }}</span>
                  <span class="ci-ev-value">{{ n(ev.value) }} {{ ev.unit }}</span>
                  <span v-if="ev.threshold" class="ci-ev-threshold">{{ ev.threshold }}</span>
                </li>
              </ul>
            </div>
          </article>
        </section>

        <!-- 7-day outlook -->
        <section class="ci-card" aria-labelledby="ci-outlook-title">
          <div class="ci-card-head">
            <h2 id="ci-outlook-title">{{ t('intel.outlook.title') }}</h2>
            <p>{{ t('intel.outlook.subtitle') }}</p>
          </div>

          <p v-if="!advisory.outlook.length" class="ci-muted">{{ t('intel.outlook.noData') }}</p>
          <ul v-else class="ci-outlook">
            <li v-for="day in advisory.outlook" :key="day.date" class="ci-outlook-day">
              <span class="ci-outlook-name">{{ weekday(day.date) }}</span>
              <span class="ci-outlook-date">{{ d(day.date, { day: 'numeric', month: 'short' }) }}</span>
              <span class="ci-outlook-temp">
                <strong>{{ n(Math.round(day.tempMax)) }}°</strong>
                <span class="ci-outlook-low">{{ n(Math.round(day.tempMin)) }}°</span>
              </span>
              <span class="ci-outlook-rain" :class="{ 'ci-outlook-wet': day.rain >= 5 }">
                {{ n(day.rain) }} {{ t('units.mm') }}
              </span>
              <span class="ci-outlook-chance">{{ n(day.rainChance) }}%</span>
            </li>
          </ul>
        </section>

        <!-- Detailed-only: indicators + stage guide -->
        <template v-if="view === 'detailed'">
          <section class="ci-card" aria-labelledby="ci-ind-title">
            <div class="ci-card-head">
              <h2 id="ci-ind-title">{{ t('intel.indicators.title') }}</h2>
              <p>{{ t('intel.indicators.subtitle') }}</p>
            </div>
            <dl class="ci-indicator-grid">
              <div v-for="item in indicatorRows" :key="item.key" class="ci-indicator">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </section>

          <section class="ci-card" aria-labelledby="ci-stage-title">
            <div class="ci-card-head">
              <h2 id="ci-stage-title">{{ t('intel.calendar.title') }}</h2>
              <p>{{ t('intel.calendar.subtitle', { crop: tf(advisory.crop.name) }) }}</p>
            </div>
            <ol class="ci-stage-list">
              <li
                v-for="stage in advisory.crop.stages"
                :key="stage.id"
                class="ci-stage"
                :class="{ 'ci-stage-current': stage.id === advisory.stage.id }"
              >
                <div class="ci-stage-head">
                  <span class="ci-stage-name">{{ tf(stage.name) }}</span>
                  <span v-if="stage.id === advisory.stage.id" class="ci-stage-badge">
                    {{ t('intel.calendar.current') }}
                  </span>
                </div>
                <p class="ci-stage-days">
                  {{ t('intel.calendar.stageDays', {
                    from: n(stage.from),
                    to: stage.to > 900 ? '…' : n(stage.to),
                  }) }}
                </p>
                <p class="ci-stage-actions">{{ tf(stage.actions) }}</p>
              </li>
            </ol>
          </section>
        </template>

        <!-- Pro actions -->
        <section class="ci-card ci-pro-actions">
          <div v-if="isPro" class="ci-pro-row">
            <button type="button" class="btn-pill-secondary" :disabled="saving" @click="handleSave">
              {{ saving ? t('intel.history.saving') : t('intel.history.save') }}
            </button>
            <button type="button" class="btn-pill-secondary" :disabled="watching" @click="handleWatch">
              {{ t('intel.watchlist.add') }}
            </button>
            <button type="button" class="btn-pill-secondary" :disabled="exporting" @click="handleExport">
              {{ exporting ? t('intel.report.exporting') : t('intel.report.export') }}
            </button>
          </div>
          <div v-else class="ci-locked">
            <h3>{{ t('intel.plan.lockedTitle') }}</h3>
            <p>{{ t('intel.plan.lockedBody') }}</p>
            <button type="button" class="btn-pill btn-pill-sm" @click="setPlan('pro')">
              {{ t('intel.plan.tryPro') }}
            </button>
          </div>
        </section>

        <!-- Where the advice comes from -->
        <section class="ci-card ci-sources" aria-labelledby="ci-src-title">
          <h2 id="ci-src-title" class="ci-sources-title">{{ t('intel.provenance.title') }}</h2>
          <ul class="ci-source-list">
            <li>{{ t('intel.provenance.weatherSource') }}</li>
            <li>{{ t('intel.provenance.ruleSource') }}</li>
          </ul>
          <p class="ci-disclaimer">{{ t('intel.provenance.notOfficial') }}</p>
        </section>
      </template>
    </div>

    <!-- ══ HISTORY TAB ════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'history'" role="tabpanel">
      <section class="ci-card">
        <div class="ci-card-head">
          <h2>{{ t('intel.history.title') }}</h2>
          <p>{{ t('intel.history.subtitle') }}</p>
        </div>

        <div v-if="!isPro" class="ci-locked">
          <h3>{{ t('intel.plan.lockedTitle') }}</h3>
          <p>{{ t('intel.plan.lockedBody') }}</p>
          <button type="button" class="btn-pill btn-pill-sm" @click="setPlan('pro')">
            {{ t('intel.plan.tryPro') }}
          </button>
        </div>
        <div v-else-if="!authState.user" class="ci-state">
          <p>{{ t('auth.signInRequired') }}</p>
          <router-link to="/login" class="btn-pill btn-pill-sm">{{ t('nav.login') }}</router-link>
        </div>
        <div v-else-if="historyLoading" class="ci-skeleton-card" aria-busy="true">
          <div class="ci-skeleton"></div>
          <div class="ci-skeleton"></div>
        </div>
        <div v-else-if="historyError" class="ci-state ci-state-error" role="alert">
          <p>{{ historyError }}</p>
          <button type="button" class="btn-pill-outline btn-pill-sm" @click="loadHistory">
            {{ t('common.retry') }}
          </button>
        </div>
        <div v-else-if="!history.length" class="ci-state">
          <h3>{{ t('intel.history.empty') }}</h3>
          <p>{{ t('intel.history.emptyBody') }}</p>
        </div>
        <ul v-else class="ci-record-list">
          <li v-for="record in history" :key="record._id" class="ci-record">
            <div class="ci-record-main">
              <span class="ci-record-status" :class="`ci-dot-${record.status}`" aria-hidden="true"></span>
              <div>
                <p class="ci-record-title">
                  {{ record.fieldName || tf(cropName(record.cropId)) }}
                </p>
                <p class="ci-record-meta">
                  {{ tf(cropName(record.cropId)) }} · {{ districtName(record.districtId) }} ·
                  {{ t('intel.history.savedOn', { date: d(record.createdAt) }) }}
                </p>
              </div>
            </div>
            <div class="ci-record-side">
              <span class="ci-severity" :class="`ci-severity-${statusSeverity(record.status)}`">
                {{ t(`intel.status.${record.status || 'good'}`) }}
              </span>
              <button
                type="button"
                class="btn-pill-outline btn-pill-sm"
                :disabled="openingRecordId === record._id"
                @click="handleOpenRecord(record)"
              >
                {{ openingRecordId === record._id ? '…' : t('intel.history.view') }}
              </button>
              <button type="button" class="btn-pill-danger btn-pill-sm" @click="handleDeleteRecord(record)">
                {{ t('common.delete') }}
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- ══ WATCHLIST TAB ══════════════════════════════════════════════ -->
    <div v-show="activeTab === 'watchlist'" role="tabpanel">
      <section class="ci-card">
        <div class="ci-card-head ci-card-head-row">
          <div>
            <h2>{{ t('intel.watchlist.title') }}</h2>
            <p>{{ t('intel.watchlist.subtitle') }}</p>
          </div>
          <button
            v-if="isPro && authState.user"
            type="button"
            class="btn-pill-outline btn-pill-sm"
            :disabled="watchLoading"
            @click="loadWatchlist"
          >
            {{ t('intel.watchlist.refreshAll') }}
          </button>
        </div>

        <div v-if="!isPro" class="ci-locked">
          <h3>{{ t('intel.plan.lockedTitle') }}</h3>
          <p>{{ t('intel.plan.lockedBody') }}</p>
          <button type="button" class="btn-pill btn-pill-sm" @click="setPlan('pro')">
            {{ t('intel.plan.tryPro') }}
          </button>
        </div>
        <div v-else-if="!authState.user" class="ci-state">
          <p>{{ t('auth.signInRequired') }}</p>
          <router-link to="/login" class="btn-pill btn-pill-sm">{{ t('nav.login') }}</router-link>
        </div>
        <div v-else-if="watchLoading" class="ci-skeleton-card" aria-busy="true">
          <div class="ci-skeleton"></div>
          <div class="ci-skeleton"></div>
        </div>
        <div v-else-if="watchError" class="ci-state ci-state-error" role="alert">
          <p>{{ watchError }}</p>
          <button type="button" class="btn-pill-outline btn-pill-sm" @click="loadWatchlist">
            {{ t('common.retry') }}
          </button>
        </div>
        <div v-else-if="!watchlist.length" class="ci-state">
          <h3>{{ t('intel.watchlist.empty') }}</h3>
          <p>{{ t('intel.watchlist.emptyBody') }}</p>
        </div>
        <ul v-else class="ci-watch-grid">
          <li
            v-for="field in watchlist"
            :key="field._id"
            class="ci-watch-card"
            :class="field.status ? `ci-watch-${field.status}` : 'ci-watch-unknown'"
          >
            <header class="ci-watch-head">
              <h3>{{ field.fieldName || tf(cropName(field.cropId)) }}</h3>
              <span class="ci-severity" :class="`ci-severity-${statusSeverity(field.status)}`">
                {{ field.refreshFailed ? t('common.notAvailable') : t(`intel.status.${field.status || 'good'}`) }}
              </span>
            </header>
            <p class="ci-watch-meta">
              {{ tf(cropName(field.cropId)) }} ·
              {{ field.location ? tf(field.location.label) : districtName(field.districtId) }}
            </p>
            <p v-if="field.stage" class="ci-watch-stage">
              {{ t('intel.summary.stage') }}: {{ tf(field.stage.name) }}
            </p>
            <p v-if="field.refreshFailed" class="ci-muted">{{ t('states.partialBody') }}</p>
            <p v-else class="ci-watch-actions">
              {{ field.actionCount
                ? t('intel.summary.actionsNeeded', { count: n(field.actionCount) })
                : t('intel.watchlist.allClear') }}
            </p>
            <ul v-if="field.topRisks?.length" class="ci-watch-risks">
              <li v-for="risk in field.topRisks" :key="risk.id">
                <span class="ci-severity-pip" :class="`ci-severity-${risk.severity}`" aria-hidden="true"></span>
                {{ risk.subject ? tf(risk.subject) : t(`intel.risk.categories.${risk.category}`) }}
              </li>
            </ul>
            <button type="button" class="btn-pill-danger btn-pill-sm" @click="handleRemoveWatch(field)">
              {{ t('intel.watchlist.remove') }}
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- ══ PLANS TAB ══════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'plans'" role="tabpanel">
      <section class="ci-card">
        <div class="ci-card-head">
          <h2>{{ t('intel.plan.compare') }}</h2>
          <p>{{ t('intel.plan.previewNote') }}</p>
        </div>
        <div class="ci-plan-table-wrap">
          <table class="ci-plan-table">
            <caption class="ci-visually-hidden">{{ t('intel.plan.compare') }}</caption>
            <thead>
              <tr>
                <th scope="col">{{ t('common.all') }}</th>
                <th scope="col">{{ t('intel.plan.free') }}</th>
                <th scope="col">{{ t('intel.plan.pro') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in planRows" :key="row.key">
                <th scope="row">{{ row.label }}</th>
                <td>
                  <span class="ci-tick" :class="row.free ? 'ci-tick-yes' : 'ci-tick-no'">
                    {{ row.free ? '✓' : '—' }}
                  </span>
                  <span class="ci-visually-hidden">
                    {{ row.free ? t('intel.plan.included') : t('intel.plan.notIncluded') }}
                  </span>
                </td>
                <td>
                  <span class="ci-tick" :class="row.pro ? 'ci-tick-yes' : 'ci-tick-no'">
                    {{ row.pro ? '✓' : '—' }}
                  </span>
                  <span class="ci-visually-hidden">
                    {{ row.pro ? t('intel.plan.included') : t('intel.plan.notIncluded') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { t, tf, n, d, weekday, localeState } from '../i18n';
import { authState } from '../stores/auth';
import { isPro, setPlan, togglePlanPreview } from '../stores/plan';
import { toastSuccess, toastError } from '../stores/toast';
import { confirmDelete } from '../stores/confirm';
import {
  getRegions,
  getIntelCrops,
  generateAdvisory,
  getAdvisoryHistory,
  getAdvisoryRecord,
  saveAdvisory,
  deleteAdvisoryRecord,
  getWatchlist,
  addWatchField,
  removeWatchField,
} from '../services/cropIntelligenceService';

// --- state ---------------------------------------------------------------
const divisions = ref([]);
const crops = ref([]);
const advisory = ref(null);
const view = ref('simple'); // farmers land on the simple view by default
const activeTab = ref('advisory');

const loading = ref(false);
const loadError = ref('');
const saving = ref(false);
const watching = ref(false);
const exporting = ref(false);

const history = ref([]);
const openingRecordId = ref(null);
const historyLoading = ref(false);
const historyError = ref('');

const watchlist = ref([]);
const watchLoading = ref(false);
const watchError = ref('');

const form = reactive({
  divisionId: '',
  districtId: '',
  upazilaId: '',
  cropId: '',
  sowingDate: '',
  areaValue: null,
  areaUnit: 'bigha',
  fieldName: '',
});

const errors = reactive({
  divisionId: '',
  districtId: '',
  cropId: '',
  sowingDate: '',
});

const todayIso = new Date().toISOString().slice(0, 10);
const twoYearsAgoIso = (() => {
  const dt = new Date();
  dt.setFullYear(dt.getFullYear() - 2);
  return dt.toISOString().slice(0, 10);
})();

const dateTimeFormat = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };

// --- derived -------------------------------------------------------------
const districts = computed(
  () => divisions.value.find((div) => div.id === form.divisionId)?.districts || []
);
const upazilas = computed(
  () => districts.value.find((dist) => dist.id === form.districtId)?.upazilas || []
);
const selectedCrop = computed(() => crops.value.find((c) => c.id === form.cropId) || null);

const tabs = computed(() => [
  { id: 'advisory', label: t('intel.shortTitle'), locked: false },
  { id: 'history', label: t('intel.history.title'), locked: !isPro.value },
  { id: 'watchlist', label: t('intel.watchlist.title'), locked: !isPro.value },
  { id: 'plans', label: t('intel.plan.compare'), locked: false },
]);

const planRows = computed(() => [
  { key: 'advisory', label: t('intel.plan.featureAdvisory'), free: true, pro: true },
  { key: 'views', label: t('intel.plan.featureSimpleDetailed'), free: true, pro: true },
  { key: 'outlook', label: t('intel.plan.featureOutlook'), free: true, pro: true },
  { key: 'history', label: t('intel.plan.featureHistory'), free: false, pro: true },
  { key: 'watchlist', label: t('intel.plan.featureWatchlist'), free: false, pro: true },
  { key: 'report', label: t('intel.plan.featureReport'), free: false, pro: true },
  { key: 'org', label: t('intel.plan.featureOrg'), free: false, pro: false },
]);

const indicatorRows = computed(() => {
  if (!advisory.value) return [];
  const ind = advisory.value.indicators;
  return [
    { key: 'avgTemp', label: t('intel.indicators.avgTemp'), value: `${n(ind.avgTemp)} ${t('units.celsius')}` },
    { key: 'maxTemp', label: t('intel.indicators.maxTemp'), value: `${n(ind.maxTemp)} ${t('units.celsius')}` },
    { key: 'minTemp', label: t('intel.indicators.minTemp'), value: `${n(ind.minTemp)} ${t('units.celsius')}` },
    { key: 'avgHumidity', label: t('intel.indicators.avgHumidity'), value: `${n(ind.avgHumidity)} %` },
    { key: 'leafWetness', label: t('intel.indicators.leafWetness'), value: n(ind.humidHours) },
    { key: 'totalRain', label: t('intel.indicators.totalRain'), value: `${n(ind.totalRain)} ${t('units.mm')}` },
    { key: 'wetDays', label: t('intel.indicators.wetDays'), value: n(ind.wetDays) },
    { key: 'maxWind', label: t('intel.indicators.maxWind'), value: `${n(ind.maxWind)} ${t('units.kmh')}` },
  ];
});

const STATUS_ICONS = {
  good: '<path d="m5 13 4 4L19 7"/>',
  watch: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/>',
  warning: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5M12 17.5v.01"/>',
  critical: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.01"/>',
};
const statusIcon = computed(() => svg(STATUS_ICONS[advisory.value?.status] || STATUS_ICONS.good));

const CATEGORY_ICONS = {
  disease: '<path d="M12 3v18M5 8l14 8M19 8 5 16"/>',
  pest: '<circle cx="12" cy="13" r="5"/><path d="M12 8V4M8 5 6 3M16 5l2-2M7 13H3M21 13h-4"/>',
  irrigation: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/>',
  heat: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/>',
  cold: '<path d="M12 2v20M4 6l16 12M20 6 4 18"/>',
  rain: '<path d="M6 14a4 4 0 0 1 .8-7.9 5.5 5.5 0 0 1 10.6 1.5A3.5 3.5 0 0 1 17.5 14Z"/><path d="M8 18v2M12 18v3M16 18v2"/>',
  flood: '<path d="M2 16c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2M2 11c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h9"/>',
  harvest: '<path d="M4 20 20 4M12 4h8v8"/>',
  nutrient: '<path d="M12 21c4-3 7-6.5 7-10a7 7 0 1 0-14 0c0 3.5 3 7 7 10Z"/>',
};

function svg(inner) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
function categoryIcon(category) {
  return svg(CATEGORY_ICONS[category] || CATEGORY_ICONS.disease);
}

const WHEN_KEYS = {
  now: 'intel.risk.windowNow',
  '24h': 'intel.risk.window24h',
  '48h': 'intel.risk.window48h',
  '3d': 'intel.risk.window3d',
  week: 'intel.risk.windowWeek',
  monitor: 'intel.risk.windowMonitor',
};
const whenLabel = (when) => t(WHEN_KEYS[when] || WHEN_KEYS.monitor);

const SEVERITY_DOTS = { low: 1, medium: 2, high: 3, critical: 4 };
const severityDots = (severity) => SEVERITY_DOTS[severity] || 1;

const STATUS_TO_SEVERITY = { good: 'low', watch: 'medium', warning: 'high', critical: 'critical' };
const statusSeverity = (status) => STATUS_TO_SEVERITY[status] || 'low';

function cropName(cropId) {
  return crops.value.find((c) => c.id === cropId)?.name || { en: cropId, bn: cropId };
}
function districtName(districtId) {
  for (const div of divisions.value) {
    const found = div.districts.find((dist) => dist.id === districtId);
    if (found) return tf(found.name);
  }
  return districtId;
}

// --- loading -------------------------------------------------------------
onMounted(async () => {
  try {
    const [regionRes, cropRes] = await Promise.all([getRegions(), getIntelCrops()]);
    divisions.value = regionRes.data.divisions || [];
    crops.value = cropRes.data.crops || [];
  } catch {
    loadError.value = t('states.loadFailed');
  }
  prefillFromLastUse();
});

/**
 * Remembering the last field is the difference between a farmer checking daily
 * and checking once. Only the inputs are stored, never the advisory.
 */
const LAST_FIELD_KEY = 'agrisphere-intel-last-field';

function prefillFromLastUse() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_FIELD_KEY) || 'null');
    if (!saved) return;
    Object.assign(form, saved);
  } catch {
    /* a corrupt entry just means no prefill */
  }
}

function rememberField() {
  try {
    localStorage.setItem(
      LAST_FIELD_KEY,
      JSON.stringify({
        divisionId: form.divisionId,
        districtId: form.districtId,
        upazilaId: form.upazilaId,
        cropId: form.cropId,
        sowingDate: form.sowingDate,
        areaValue: form.areaValue,
        areaUnit: form.areaUnit,
      })
    );
  } catch {
    /* storage full or blocked — prefill is a convenience, not a requirement */
  }
}

function onDivisionChange() {
  form.districtId = '';
  form.upazilaId = '';
  errors.divisionId = '';
}
function onDistrictChange() {
  form.upazilaId = '';
  errors.districtId = '';
}

function validate() {
  errors.divisionId = form.divisionId ? '' : t('validation.requiredNamed', { field: t('intel.setup.division') });
  errors.districtId = form.districtId ? '' : t('validation.requiredNamed', { field: t('intel.setup.district') });
  errors.cropId = form.cropId ? '' : t('validation.requiredNamed', { field: t('intel.setup.crop') });

  if (!form.sowingDate) {
    errors.sowingDate = t('validation.requiredNamed', { field: t('intel.setup.sowingDate') });
  } else if (form.sowingDate > todayIso || form.sowingDate < twoYearsAgoIso) {
    errors.sowingDate = t('intel.errors.invalidSowing');
  } else {
    errors.sowingDate = '';
  }

  return !errors.divisionId && !errors.districtId && !errors.cropId && !errors.sowingDate;
}

// Opens a saved advisory. The list endpoint omits the heavy payload, so the
// full record is fetched here and shown through the normal advisory view.
async function handleOpenRecord(record) {
  openingRecordId.value = record._id;

  try {
    const { data } = await getAdvisoryRecord(record._id);

    if (data && data.payload) {
      advisory.value = data.payload;
      activeTab.value = 'advisory';
    } else {
      toastError(t('intel.errors.recordEmpty'));
    }
  } catch (err) {
    toastError(err.response?.data?.message || t('intel.errors.loadRecordFailed'));
  } finally {
    openingRecordId.value = null;
  }
}

function payload() {
  return {
    divisionId: form.divisionId,
    districtId: form.districtId,
    upazilaId: form.upazilaId || null,
    cropId: form.cropId,
    sowingDate: form.sowingDate,
    areaValue: form.areaValue ?? undefined,
    areaUnit: form.areaUnit,
    fieldName: form.fieldName || undefined,
  };
}

async function handleGenerate() {
  if (!validate()) {
    toastError(t('validation.fixErrors'));
    return;
  }
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await generateAdvisory(payload());
    advisory.value = data;
    rememberField();
  } catch (err) {
    loadError.value = err.response?.data?.message || t('intel.errors.generateFailed');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!authState.user) {
    toastError(t('auth.signInRequired'));
    return;
  }
  saving.value = true;
  try {
    await saveAdvisory(payload());
    toastSuccess(t('intel.history.saved'));
    if (activeTab.value === 'history') loadHistory();
    else history.value = [];
  } catch (err) {
    toastError(err.response?.data?.message || t('intel.errors.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function handleWatch() {
  if (!authState.user) {
    toastError(t('auth.signInRequired'));
    return;
  }
  watching.value = true;
  try {
    await addWatchField(payload());
    toastSuccess(t('intel.watchlist.added'));
    watchlist.value = [];
  } catch (err) {
    toastError(err.response?.data?.message || t('states.saveFailed'));
  } finally {
    watching.value = false;
  }
}

async function loadHistory() {
  if (!isPro.value || !authState.user) return;
  historyLoading.value = true;
  historyError.value = '';
  try {
    const { data } = await getAdvisoryHistory();
    history.value = data;
  } catch (err) {
    historyError.value = err.response?.data?.message || t('intel.errors.historyFailed');
  } finally {
    historyLoading.value = false;
  }
}

async function handleDeleteRecord(record) {
  const ok = await confirmDelete(t('intel.history.deleteConfirm'), {
    title: t('confirm.deleteTitle'),
    confirmText: t('common.delete'),
    cancelText: t('common.cancel'),
  });
  if (!ok) return;
  try {
    await deleteAdvisoryRecord(record._id);
    history.value = history.value.filter((r) => r._id !== record._id);
    toastSuccess(t('intel.history.deleted'));
  } catch (err) {
    toastError(err.response?.data?.message || t('states.saveFailed'));
  }
}

async function loadWatchlist() {
  if (!isPro.value || !authState.user) return;
  watchLoading.value = true;
  watchError.value = '';
  try {
    const { data } = await getWatchlist();
    watchlist.value = data;
  } catch (err) {
    watchError.value = err.response?.data?.message || t('states.loadFailed');
  } finally {
    watchLoading.value = false;
  }
}

async function handleRemoveWatch(field) {
  const ok = await confirmDelete(t('intel.watchlist.removeConfirm'), {
    title: t('confirm.deleteTitle'),
    confirmText: t('common.remove'),
    cancelText: t('common.cancel'),
  });
  if (!ok) return;
  try {
    await removeWatchField(field._id);
    watchlist.value = watchlist.value.filter((f) => f._id !== field._id);
    toastSuccess(t('common.saved'));
  } catch (err) {
    toastError(err.response?.data?.message || t('states.saveFailed'));
  }
}

// Tabs load lazily so opening the page costs one request set, not three.
watch(activeTab, (tab) => {
  if (tab === 'history' && !history.value.length) loadHistory();
  if (tab === 'watchlist' && !watchlist.value.length) loadWatchlist();
});

/**
 * PDF export. jsPDF's built-in fonts have no Bengali glyphs, so a Bangla
 * report would silently render as empty boxes. Rather than ship a broken file
 * we generate the report in English and say so, which is also what a farmer
 * would hand to a dealer, buyer or insurer.
 */
async function handleExport() {
  if (!advisory.value) return;
  exporting.value = true;
  try {
    const [{ jsPDF }] = await Promise.all([import('jspdf')]);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth();
    let y = margin;

    const line = (text, size = 10, style = 'normal', gap = 14) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      const wrapped = doc.splitTextToSize(text, width - margin * 2);
      wrapped.forEach((row) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(row, margin, y);
        y += gap;
      });
    };

    const a = advisory.value;
    line('AgriSphere Crop Advisory', 18, 'bold', 24);
    line(`${a.crop.name.en} — ${a.location.label.en}`, 12, 'bold', 18);
    line(`Growth stage: ${a.stage.name.en} (day ${a.field.daysAfterSowing} after sowing)`);
    line(`Prepared: ${new Date(a.generatedAt).toLocaleString('en-GB')}`);
    line(`Data source: ${a.dataMode === 'demo' ? 'DEMONSTRATION DATA — not a live forecast' : 'Open-Meteo public forecast'}`);
    y += 8;

    line(`Overall status: ${a.status.toUpperCase()} — ${a.actionCount} action(s) need attention`, 12, 'bold', 20);

    if (!a.risks.length) {
      line('No thresholds were crossed for this crop and growth stage this week.');
    }

    a.risks.forEach((risk, index) => {
      y += 6;
      const heading = risk.subject ? risk.subject.en : risk.category;
      line(`${index + 1}. ${heading} — ${risk.severity.toUpperCase()}`, 11, 'bold', 16);
      line(`What is happening: ${risk.whatsHappening.en}`);
      line(`Why it matters: ${risk.whyItMatters.en}`);
      line('What to do:', 10, 'bold');
      risk.actions.forEach((action) => line(`  • ${action.en}`));
      line(`When to act: ${risk.when}`);
    });

    y += 12;
    line('7-day outlook', 12, 'bold', 18);
    a.outlook.forEach((day) => {
      line(`${day.date}   ${Math.round(day.tempMax)}/${Math.round(day.tempMin)} C   rain ${day.rain} mm (${day.rainChance}%)   wind ${day.windMax} km/h`);
    });

    y += 12;
    line('About this report', 11, 'bold', 16);
    line(
      'Decision-support report generated by AgriSphere from public weather forecast data and published agronomic threshold rules. It is not an official government advisory and does not confirm the presence of any disease or pest. Confirm with your Upazila Agriculture Officer or an AgriSphere expert before applying any input.'
    );
    line('This report is issued in English because the PDF font set does not include Bengali characters.');

    doc.save(`agrisphere-advisory-${a.crop.id}-${a.generatedAt.slice(0, 10)}.pdf`);
    toastSuccess(t('common.download'));
  } catch (err) {
    console.error('PDF export failed', err);
    toastError(t('states.saveFailed'));
  } finally {
    exporting.value = false;
  }
}

// Switching plan away from Pro should not leave the user stranded on a tab
// they can no longer use.
watch(isPro, (pro) => {
  if (!pro && (activeTab.value === 'history' || activeTab.value === 'watchlist')) {
    activeTab.value = 'advisory';
  }
});

// Language changes are string-only; nothing needs refetching, but the locale
// is referenced here so computed labels re-evaluate.
watch(() => localeState.locale, () => {});
</script>
