import { createRouter, createWebHistory } from 'vue-router';
import { authState } from '../stores/auth';
import { t } from '../i18n';

import Home from '../pages/Home.vue';
import Login from '../pages/Login.vue';
import Register from '../pages/Register.vue';
import Profile from '../pages/Profile.vue';
import ProfileDashboard from '../pages/ProfileDashboard.vue';
import ExpertSearch from '../pages/ExpertSearch.vue';
import ExpertProfile from '../pages/ExpertProfile.vue';
import Organizations from '../pages/Organizations.vue';
import AddOrganization from '../pages/AddOrganization.vue';
import MyOrganizations from '../pages/MyOrganizations.vue';
import OrganizationDetail from '../pages/OrganizationDetail.vue';
import DiseaseLibrary from '../pages/DiseaseLibrary.vue';
import DiseaseSubmission from '../pages/DiseaseSubmission.vue';
import DiagnosisHistory from '../pages/DiagnosisHistory.vue';
import Consultations from '../pages/Consultations.vue';
import RequestConsultation from '../pages/RequestConsultation.vue';
import PendingRequests from '../pages/PendingRequests.vue';
import ConsultationRecord from '../pages/ConsultationRecord.vue';
import FarmRecords from '../pages/FarmRecords.vue';
import Expenses from '../pages/Expenses.vue';
import Map from '../pages/Map.vue';
import Weather from '../pages/Weather.vue';
import GetWeather from '../pages/GetWeather.vue';
import Timeline from '../pages/Timeline.vue';
import TagManagement from '../pages/TagManagement.vue';
import FarmingRecommendation from '../pages/FarmingRecommendation.vue';
import ProvideCropDiagnosisReport from '../pages/ProvideCropDiagnosisReport.vue';
import RequestFarmingExpertise from '../pages/RequestFarmingExpertise.vue';
import ProvideFarmingExpertise from '../pages/ProvideFarmingExpertise.vue';
import CropDetails from '../pages/CropDetails.vue';
import FinancialAnalysis from '../pages/FinancialAnalysis.vue';
import ExpenseManagement from '../pages/ExpenseManagement.vue';
import SeasonalPerformance from '../pages/SeasonalPerformance.vue';
import Dashboard from '../pages/Dashboard.vue';
import CropAnalysis from '../pages/CropAnalysis.vue';
import Messages from '../pages/Messages.vue';
import PricePlanner from '../pages/PricePlanner.vue';
import Community from '../pages/Community.vue';
import CommunityPost from '../pages/CommunityPost.vue';
import CropIntelligence from '../pages/CropIntelligence.vue';
import NotFound from '../pages/NotFound.vue';
import Marketplace from '../pages/Marketplace.vue';
import FarmerPublicProfile from '../pages/FarmerPublicProfile.vue';
import ListingDetail from '../pages/ListingDetail.vue';
import Orders from '../pages/Orders.vue';
import FieldMap from '../pages/FieldMap.vue';
import FarmerDirectory from '../pages/FarmerDirectory.vue';
import Wallet from '../pages/Wallet.vue';
const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/profile', name: 'Profile', component: Profile },
  { path: '/profile-dashboard', name: 'ProfileDashboard', component: ProfileDashboard, meta: { requiresAuth: true } },
  { path: '/experts', name: 'ExpertSearch', component: ExpertSearch },
  { path: '/experts/:id', name: 'ExpertProfile', component: ExpertProfile },
  { path: '/organizations', name: 'Organizations', component: Organizations },
  { path: '/organizations/new', name: 'AddOrganization', component: AddOrganization },
  { path: '/organizations/edit/:id', name: 'EditOrganization', component: AddOrganization },
  { path: '/organizations/mine', name: 'MyOrganizations', component: MyOrganizations },
  { path: '/organizations/:id', name: 'OrganizationDetail', component: OrganizationDetail },
  { path: '/disease-library', name: 'DiseaseLibrary', component: DiseaseLibrary,},
  { path: '/disease-submission', name: 'DiseaseSubmission', component: DiseaseSubmission },
  { path: '/tag-management', name: 'TagManagement', component: TagManagement},
  { path: '/diagnosis-history', name: 'DiagnosisHistory', component: DiagnosisHistory },
  { path: '/provide-crop-diagnosis-report', name: 'ProvideCropDiagnosisReport', component: ProvideCropDiagnosisReport },
  { path: '/farming-expertise/request', name: 'RequestFarmingExpertise', component: RequestFarmingExpertise },
  { path: '/farming-expertise/provide', name: 'ProvideFarmingExpertise', component: ProvideFarmingExpertise },
  { path: '/consultations', name: 'Consultations', component: Consultations },
  { path: '/consultations/request', name: 'RequestConsultation', component: RequestConsultation },
  { path: '/consultations/pending', name: 'PendingRequests', component: PendingRequests },
  { path: '/consultations/records', name: 'ConsultationRecord', component: ConsultationRecord },
  { path: '/farm-records', name: 'FarmRecords', component: FarmRecords },
  { path: '/expenses', name: 'Expenses', component: Expenses },
  { path: '/map', name: 'Map', component: Map },
  { path: '/marketplace', name: 'Marketplace', component: Marketplace },
  { path: '/marketplace/:id', name: 'ListingDetail', component: ListingDetail },
  { path: '/orders', name: 'Orders', component: Orders, meta: { requiresAuth: true } },
  { path: '/wallet', name: 'Wallet', component: Wallet, meta: { requiresAuth: true } },
  { path: '/field-map', name: 'FieldMap', component: FieldMap, meta: { requiresAuth: true } },
  { path: '/farmers', name: 'FarmerDirectory', component: FarmerDirectory },
  { path: '/farmers/:id/public', name: 'FarmerPublicProfile', component: FarmerPublicProfile },
  { path: '/weather', name: 'Weather', component: Weather },
  { path: '/get-weather', name: 'GetWeather', component: GetWeather },
  { path: '/timeline', name: 'Timeline', component: Timeline },
  { path: '/farming-recommendation', name: 'FarmingRecommendation', component: FarmingRecommendation },
  { path: '/farm-records/:id', name: 'CropDetails', component: CropDetails },
  { path: '/financial-analysis', name: 'FinancialAnalysis', component: FinancialAnalysis, meta: { requiresAuth: true, role: 'farmer' } },
  { path: '/expense-management', name: 'ExpenseManagement', component: ExpenseManagement, meta: { requiresAuth: true, role: 'farmer' } },
  { path: '/seasonal-performance', name: 'SeasonalPerformance', component: SeasonalPerformance, meta: { requiresAuth: true, role: 'farmer' } },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/crop-analysis', name: 'CropAnalysis', component: CropAnalysis, meta: { requiresAuth: true } },
  { path: '/messages', name: 'Messages', component: Messages, meta: { requiresAuth: true } },
  { path: '/price-planner', name: 'PricePlanner', component: PricePlanner, meta: { requiresAuth: true } },
  { path: '/community', name: 'Community', component: Community },
  { path: '/community/:id', name: 'CommunityPost', component: CommunityPost },

  {
    path: '/crop-intelligence',
    name: 'CropIntelligence',
    component: CropIntelligence,
    meta: { titleKey: 'intel.title' },
  },

  // Anything unmatched lands on a real page instead of a blank screen.
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { titleKey: 'notFound.title' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Start each new page at the top instead of keeping the previous page's
  // scroll offset; still restore scroll position on browser back/forward.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

/**
 * Route guard.
 *
 * Several routes already declared `meta.requiresAuth` and `meta.role`, but
 * nothing enforced them — a signed-out visitor could open /dashboard and reach
 * a page that immediately failed its own API calls. The guard turns that into
 * a clean redirect, and preserves the intended destination so the user lands
 * where they were going after logging in.
 */
router.beforeEach((to) => {
  const isAuthenticated = !!authState.token;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (to.meta.role && authState.user?.role !== to.meta.role) {
    // Signed in, but this area belongs to another role. Home is a safe landing
    // spot for every role, so no one hits a dead end.
    return { path: '/' };
  }

  return true;
});

// Keep the browser tab title in step with the page and the chosen language.
router.afterEach((to) => {
  const title = to.meta.titleKey ? t(to.meta.titleKey) : '';
  document.title = title ? `${title} · AgriSphere` : 'AgriSphere';
});

export default router;
