import { createRouter, createWebHistory } from 'vue-router';

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
  { path: '/weather', name: 'Weather', component: Weather },
  { path: '/get-weather', name: 'GetWeather', component: GetWeather },
  { path: '/timeline', name: 'Timeline', component: Timeline },
  { path: '/farming-recommendation', name: 'FarmingRecommendation', component: FarmingRecommendation },
  { path: '/farm-records/:id', name: 'CropDetails', component: CropDetails },
  { path: '/financial-analysis', name: 'FinancialAnalysis', component: FinancialAnalysis, meta: { requiresAuth: true, role: 'farmer' } },
  { path: '/expense-management', name: 'ExpenseManagement', component: ExpenseManagement, meta: { requiresAuth: true, role: 'farmer' } },
  { path: '/seasonal-performance', name: 'SeasonalPerformance', component: SeasonalPerformance, meta: { requiresAuth: true, role: 'farmer' } },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true, role: 'farmer' } },
  { path: '/crop-analysis', name: 'CropAnalysis', component: CropAnalysis, meta: { requiresAuth: true } },
  { path: '/messages', name: 'Messages', component: Messages, meta: { requiresAuth: true } },
  { path: '/price-planner', name: 'PricePlanner', component: PricePlanner, meta: { requiresAuth: true } },
  { path: '/community', name: 'Community', component: Community },
  { path: '/community/:id', name: 'CommunityPost', component: CommunityPost },
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

export default router;
