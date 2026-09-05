/**
 * Bangladesh administrative reference data used by the Crop Intelligence module.
 *
 * Scope and honesty notes:
 *  - All 8 divisions and all 64 districts are listed, each with the approximate
 *    coordinates of the district headquarters. Forecasts are resolved at these
 *    coordinates, which is why the UI describes the outlook as district-level.
 *  - `upazilas` is a curated list for districts where the names are well
 *    established. It is deliberately incomplete rather than guessed at: any
 *    district without a list simply shows "Whole district" in the UI, and the
 *    advisory is unaffected. Add more lists here as they are verified.
 *  - Upazilas carry no separate coordinates. They refine the label the farmer
 *    sees and are stored with saved advisories, but the forecast still comes
 *    from the district point. Nothing in the UI claims otherwise.
 */

const DIVISIONS = [
  {
    id: 'barishal',
    name: { en: 'Barishal', bn: 'বরিশাল' },
    districts: [
      { id: 'barguna', name: { en: 'Barguna', bn: 'বরগুনা' }, lat: 22.09, lon: 90.11 },
      {
        id: 'barishal',
        name: { en: 'Barishal', bn: 'বরিশাল' },
        lat: 22.7,
        lon: 90.37,
        upazilas: [
          { id: 'agailjhara', name: { en: 'Agailjhara', bn: 'আগৈলঝাড়া' } },
          { id: 'babuganj', name: { en: 'Babuganj', bn: 'বাবুগঞ্জ' } },
          { id: 'bakerganj', name: { en: 'Bakerganj', bn: 'বাকেরগঞ্জ' } },
          { id: 'banaripara', name: { en: 'Banaripara', bn: 'বানারীপাড়া' } },
          { id: 'gaurnadi', name: { en: 'Gaurnadi', bn: 'গৌরনদী' } },
          { id: 'hizla', name: { en: 'Hizla', bn: 'হিজলা' } },
          { id: 'barishal-sadar', name: { en: 'Barishal Sadar', bn: 'বরিশাল সদর' } },
          { id: 'mehendiganj', name: { en: 'Mehendiganj', bn: 'মেহেন্দিগঞ্জ' } },
          { id: 'muladi', name: { en: 'Muladi', bn: 'মুলাদী' } },
          { id: 'wazirpur', name: { en: 'Wazirpur', bn: 'উজিরপুর' } },
        ],
      },
      { id: 'bhola', name: { en: 'Bhola', bn: 'ভোলা' }, lat: 22.69, lon: 90.65 },
      { id: 'jhalokati', name: { en: 'Jhalokati', bn: 'ঝালকাঠি' }, lat: 22.64, lon: 90.2 },
      { id: 'patuakhali', name: { en: 'Patuakhali', bn: 'পটুয়াখালী' }, lat: 22.36, lon: 90.33 },
      { id: 'pirojpur', name: { en: 'Pirojpur', bn: 'পিরোজপুর' }, lat: 22.58, lon: 89.98 },
    ],
  },
  {
    id: 'chattogram',
    name: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
    districts: [
      { id: 'bandarban', name: { en: 'Bandarban', bn: 'বান্দরবান' }, lat: 22.2, lon: 92.22 },
      { id: 'brahmanbaria', name: { en: 'Brahmanbaria', bn: 'ব্রাহ্মণবাড়িয়া' }, lat: 23.96, lon: 91.11 },
      { id: 'chandpur', name: { en: 'Chandpur', bn: 'চাঁদপুর' }, lat: 23.23, lon: 90.66 },
      {
        id: 'chattogram',
        name: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
        lat: 22.36,
        lon: 91.83,
        upazilas: [
          { id: 'anwara', name: { en: 'Anwara', bn: 'আনোয়ারা' } },
          { id: 'banshkhali', name: { en: 'Banshkhali', bn: 'বাঁশখালী' } },
          { id: 'boalkhali', name: { en: 'Boalkhali', bn: 'বোয়ালখালী' } },
          { id: 'fatikchhari', name: { en: 'Fatikchhari', bn: 'ফটিকছড়ি' } },
          { id: 'hathazari', name: { en: 'Hathazari', bn: 'হাটহাজারী' } },
          { id: 'lohagara-ctg', name: { en: 'Lohagara', bn: 'লোহাগাড়া' } },
          { id: 'mirsharai', name: { en: 'Mirsharai', bn: 'মীরসরাই' } },
          { id: 'patiya', name: { en: 'Patiya', bn: 'পটিয়া' } },
          { id: 'rangunia', name: { en: 'Rangunia', bn: 'রাঙ্গুনিয়া' } },
          { id: 'raozan', name: { en: 'Raozan', bn: 'রাউজান' } },
          { id: 'satkania', name: { en: 'Satkania', bn: 'সাতকানিয়া' } },
          { id: 'sitakunda', name: { en: 'Sitakunda', bn: 'সীতাকুণ্ড' } },
        ],
      },
      {
        id: 'cumilla',
        name: { en: 'Cumilla', bn: 'কুমিল্লা' },
        lat: 23.46,
        lon: 91.18,
        upazilas: [
          { id: 'barura', name: { en: 'Barura', bn: 'বরুড়া' } },
          { id: 'brahmanpara', name: { en: 'Brahmanpara', bn: 'ব্রাহ্মণপাড়া' } },
          { id: 'burichang', name: { en: 'Burichang', bn: 'বুড়িচং' } },
          { id: 'chandina', name: { en: 'Chandina', bn: 'চান্দিনা' } },
          { id: 'chauddagram', name: { en: 'Chauddagram', bn: 'চৌদ্দগ্রাম' } },
          { id: 'daudkandi', name: { en: 'Daudkandi', bn: 'দাউদকান্দি' } },
          { id: 'debidwar', name: { en: 'Debidwar', bn: 'দেবিদ্বার' } },
          { id: 'homna', name: { en: 'Homna', bn: 'হোমনা' } },
          { id: 'laksam', name: { en: 'Laksam', bn: 'লাকসাম' } },
          { id: 'muradnagar', name: { en: 'Muradnagar', bn: 'মুরাদনগর' } },
          { id: 'nangalkot', name: { en: 'Nangalkot', bn: 'নাঙ্গলকোট' } },
          { id: 'titas', name: { en: 'Titas', bn: 'তিতাস' } },
        ],
      },
      { id: 'coxs-bazar', name: { en: "Cox's Bazar", bn: 'কক্সবাজার' }, lat: 21.44, lon: 91.97 },
      { id: 'feni', name: { en: 'Feni', bn: 'ফেনী' }, lat: 23.02, lon: 91.4 },
      { id: 'khagrachhari', name: { en: 'Khagrachhari', bn: 'খাগড়াছড়ি' }, lat: 23.1, lon: 91.98 },
      { id: 'lakshmipur', name: { en: 'Lakshmipur', bn: 'লক্ষ্মীপুর' }, lat: 22.94, lon: 90.83 },
      { id: 'noakhali', name: { en: 'Noakhali', bn: 'নোয়াখালী' }, lat: 22.87, lon: 91.1 },
      { id: 'rangamati', name: { en: 'Rangamati', bn: 'রাঙ্গামাটি' }, lat: 22.63, lon: 92.2 },
    ],
  },
  {
    id: 'dhaka',
    name: { en: 'Dhaka', bn: 'ঢাকা' },
    districts: [
      {
        id: 'dhaka',
        name: { en: 'Dhaka', bn: 'ঢাকা' },
        lat: 23.81,
        lon: 90.41,
        upazilas: [
          { id: 'dhamrai', name: { en: 'Dhamrai', bn: 'ধামরাই' } },
          { id: 'dohar', name: { en: 'Dohar', bn: 'দোহার' } },
          { id: 'keraniganj', name: { en: 'Keraniganj', bn: 'কেরানীগঞ্জ' } },
          { id: 'nawabganj-dhaka', name: { en: 'Nawabganj', bn: 'নবাবগঞ্জ' } },
          { id: 'savar', name: { en: 'Savar', bn: 'সাভার' } },
        ],
      },
      { id: 'faridpur', name: { en: 'Faridpur', bn: 'ফরিদপুর' }, lat: 23.6, lon: 89.83 },
      { id: 'gazipur', name: { en: 'Gazipur', bn: 'গাজীপুর' }, lat: 23.99, lon: 90.42 },
      { id: 'gopalganj', name: { en: 'Gopalganj', bn: 'গোপালগঞ্জ' }, lat: 23.01, lon: 89.83 },
      {
        id: 'kishoreganj',
        name: { en: 'Kishoreganj', bn: 'কিশোরগঞ্জ' },
        lat: 24.44,
        lon: 90.78,
        upazilas: [
          { id: 'austagram', name: { en: 'Austagram', bn: 'অষ্টগ্রাম' } },
          { id: 'bajitpur', name: { en: 'Bajitpur', bn: 'বাজিতপুর' } },
          { id: 'bhairab', name: { en: 'Bhairab', bn: 'ভৈরব' } },
          { id: 'hossainpur', name: { en: 'Hossainpur', bn: 'হোসেনপুর' } },
          { id: 'itna', name: { en: 'Itna', bn: 'ইটনা' } },
          { id: 'karimganj', name: { en: 'Karimganj', bn: 'করিমগঞ্জ' } },
          { id: 'katiadi', name: { en: 'Katiadi', bn: 'কটিয়াদী' } },
          { id: 'kishoreganj-sadar', name: { en: 'Kishoreganj Sadar', bn: 'কিশোরগঞ্জ সদর' } },
          { id: 'kuliarchar', name: { en: 'Kuliarchar', bn: 'কুলিয়ারচর' } },
          { id: 'mithamain', name: { en: 'Mithamain', bn: 'মিঠামইন' } },
          { id: 'nikli', name: { en: 'Nikli', bn: 'নিকলী' } },
          { id: 'pakundia', name: { en: 'Pakundia', bn: 'পাকুন্দিয়া' } },
          { id: 'tarail', name: { en: 'Tarail', bn: 'তাড়াইল' } },
        ],
      },
      { id: 'madaripur', name: { en: 'Madaripur', bn: 'মাদারীপুর' }, lat: 23.16, lon: 90.19 },
      { id: 'manikganj', name: { en: 'Manikganj', bn: 'মানিকগঞ্জ' }, lat: 23.86, lon: 90.0 },
      { id: 'munshiganj', name: { en: 'Munshiganj', bn: 'মুন্সিগঞ্জ' }, lat: 23.55, lon: 90.53 },
      { id: 'narayanganj', name: { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ' }, lat: 23.62, lon: 90.5 },
      { id: 'narsingdi', name: { en: 'Narsingdi', bn: 'নরসিংদী' }, lat: 23.92, lon: 90.72 },
      { id: 'rajbari', name: { en: 'Rajbari', bn: 'রাজবাড়ী' }, lat: 23.76, lon: 89.64 },
      { id: 'shariatpur', name: { en: 'Shariatpur', bn: 'শরীয়তপুর' }, lat: 23.21, lon: 90.34 },
      {
        id: 'tangail',
        name: { en: 'Tangail', bn: 'টাঙ্গাইল' },
        lat: 24.25,
        lon: 89.92,
        upazilas: [
          { id: 'basail', name: { en: 'Basail', bn: 'বাসাইল' } },
          { id: 'bhuapur', name: { en: 'Bhuapur', bn: 'ভূঞাপুর' } },
          { id: 'delduar', name: { en: 'Delduar', bn: 'দেলদুয়ার' } },
          { id: 'ghatail', name: { en: 'Ghatail', bn: 'ঘাটাইল' } },
          { id: 'gopalpur-tangail', name: { en: 'Gopalpur', bn: 'গোপালপুর' } },
          { id: 'kalihati', name: { en: 'Kalihati', bn: 'কালিহাতী' } },
          { id: 'madhupur', name: { en: 'Madhupur', bn: 'মধুপুর' } },
          { id: 'mirzapur', name: { en: 'Mirzapur', bn: 'মির্জাপুর' } },
          { id: 'nagarpur', name: { en: 'Nagarpur', bn: 'নাগরপুর' } },
          { id: 'sakhipur', name: { en: 'Sakhipur', bn: 'সখীপুর' } },
          { id: 'tangail-sadar', name: { en: 'Tangail Sadar', bn: 'টাঙ্গাইল সদর' } },
        ],
      },
    ],
  },
  {
    id: 'khulna',
    name: { en: 'Khulna', bn: 'খুলনা' },
    districts: [
      { id: 'bagerhat', name: { en: 'Bagerhat', bn: 'বাগেরহাট' }, lat: 22.65, lon: 89.79 },
      { id: 'chuadanga', name: { en: 'Chuadanga', bn: 'চুয়াডাঙ্গা' }, lat: 23.64, lon: 88.84 },
      {
        id: 'jashore',
        name: { en: 'Jashore', bn: 'যশোর' },
        lat: 23.17,
        lon: 89.21,
        upazilas: [
          { id: 'abhaynagar', name: { en: 'Abhaynagar', bn: 'অভয়নগর' } },
          { id: 'bagherpara', name: { en: 'Bagherpara', bn: 'বাঘারপাড়া' } },
          { id: 'chaugachha', name: { en: 'Chaugachha', bn: 'চৌগাছা' } },
          { id: 'jhikargachha', name: { en: 'Jhikargachha', bn: 'ঝিকরগাছা' } },
          { id: 'keshabpur', name: { en: 'Keshabpur', bn: 'কেশবপুর' } },
          { id: 'jashore-sadar', name: { en: 'Jashore Sadar', bn: 'যশোর সদর' } },
          { id: 'manirampur', name: { en: 'Manirampur', bn: 'মণিরামপুর' } },
          { id: 'sharsha', name: { en: 'Sharsha', bn: 'শার্শা' } },
        ],
      },
      { id: 'jhenaidah', name: { en: 'Jhenaidah', bn: 'ঝিনাইদহ' }, lat: 23.54, lon: 89.17 },
      { id: 'khulna', name: { en: 'Khulna', bn: 'খুলনা' }, lat: 22.81, lon: 89.56 },
      { id: 'kushtia', name: { en: 'Kushtia', bn: 'কুষ্টিয়া' }, lat: 23.9, lon: 89.12 },
      { id: 'magura', name: { en: 'Magura', bn: 'মাগুরা' }, lat: 23.49, lon: 89.42 },
      { id: 'meherpur', name: { en: 'Meherpur', bn: 'মেহেরপুর' }, lat: 23.76, lon: 88.63 },
      { id: 'narail', name: { en: 'Narail', bn: 'নড়াইল' }, lat: 23.16, lon: 89.5 },
      { id: 'satkhira', name: { en: 'Satkhira', bn: 'সাতক্ষীরা' }, lat: 22.72, lon: 89.07 },
    ],
  },
  {
    id: 'mymensingh',
    name: { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
    districts: [
      { id: 'jamalpur', name: { en: 'Jamalpur', bn: 'জামালপুর' }, lat: 24.94, lon: 89.94 },
      {
        id: 'mymensingh',
        name: { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
        lat: 24.75,
        lon: 90.4,
        upazilas: [
          { id: 'bhaluka', name: { en: 'Bhaluka', bn: 'ভালুকা' } },
          { id: 'dhobaura', name: { en: 'Dhobaura', bn: 'ধোবাউড়া' } },
          { id: 'fulbaria', name: { en: 'Fulbaria', bn: 'ফুলবাড়ীয়া' } },
          { id: 'gaffargaon', name: { en: 'Gaffargaon', bn: 'গফরগাঁও' } },
          { id: 'gauripur', name: { en: 'Gauripur', bn: 'গৌরীপুর' } },
          { id: 'haluaghat', name: { en: 'Haluaghat', bn: 'হালুয়াঘাট' } },
          { id: 'ishwarganj', name: { en: 'Ishwarganj', bn: 'ঈশ্বরগঞ্জ' } },
          { id: 'mymensingh-sadar', name: { en: 'Mymensingh Sadar', bn: 'ময়মনসিংহ সদর' } },
          { id: 'muktagachha', name: { en: 'Muktagachha', bn: 'মুক্তাগাছা' } },
          { id: 'nandail', name: { en: 'Nandail', bn: 'নান্দাইল' } },
          { id: 'phulpur', name: { en: 'Phulpur', bn: 'ফুলপুর' } },
          { id: 'trishal', name: { en: 'Trishal', bn: 'ত্রিশাল' } },
        ],
      },
      { id: 'netrokona', name: { en: 'Netrokona', bn: 'নেত্রকোণা' }, lat: 24.87, lon: 90.73 },
      { id: 'sherpur', name: { en: 'Sherpur', bn: 'শেরপুর' }, lat: 25.02, lon: 90.02 },
    ],
  },
  {
    id: 'rajshahi',
    name: { en: 'Rajshahi', bn: 'রাজশাহী' },
    districts: [
      {
        id: 'bogura',
        name: { en: 'Bogura', bn: 'বগুড়া' },
        lat: 24.85,
        lon: 89.37,
        upazilas: [
          { id: 'adamdighi', name: { en: 'Adamdighi', bn: 'আদমদীঘি' } },
          { id: 'bogura-sadar', name: { en: 'Bogura Sadar', bn: 'বগুড়া সদর' } },
          { id: 'dhunat', name: { en: 'Dhunat', bn: 'ধুনট' } },
          { id: 'dupchanchia', name: { en: 'Dupchanchia', bn: 'দুপচাঁচিয়া' } },
          { id: 'gabtali', name: { en: 'Gabtali', bn: 'গাবতলী' } },
          { id: 'kahaloo', name: { en: 'Kahaloo', bn: 'কাহালু' } },
          { id: 'nandigram', name: { en: 'Nandigram', bn: 'নন্দীগ্রাম' } },
          { id: 'sariakandi', name: { en: 'Sariakandi', bn: 'সারিয়াকান্দি' } },
          { id: 'shajahanpur', name: { en: 'Shajahanpur', bn: 'শাজাহানপুর' } },
          { id: 'sherpur-bogura', name: { en: 'Sherpur', bn: 'শেরপুর' } },
          { id: 'shibganj-bogura', name: { en: 'Shibganj', bn: 'শিবগঞ্জ' } },
          { id: 'sonatala', name: { en: 'Sonatala', bn: 'সোনাতলা' } },
        ],
      },
      { id: 'chapai-nawabganj', name: { en: 'Chapai Nawabganj', bn: 'চাঁপাইনবাবগঞ্জ' }, lat: 24.6, lon: 88.28 },
      { id: 'joypurhat', name: { en: 'Joypurhat', bn: 'জয়পুরহাট' }, lat: 25.1, lon: 89.03 },
      {
        id: 'naogaon',
        name: { en: 'Naogaon', bn: 'নওগাঁ' },
        lat: 24.8,
        lon: 88.94,
        upazilas: [
          { id: 'atrai', name: { en: 'Atrai', bn: 'আত্রাই' } },
          { id: 'badalgachhi', name: { en: 'Badalgachhi', bn: 'বদলগাছী' } },
          { id: 'dhamoirhat', name: { en: 'Dhamoirhat', bn: 'ধামইরহাট' } },
          { id: 'manda', name: { en: 'Manda', bn: 'মান্দা' } },
          { id: 'mohadevpur', name: { en: 'Mohadevpur', bn: 'মহাদেবপুর' } },
          { id: 'naogaon-sadar', name: { en: 'Naogaon Sadar', bn: 'নওগাঁ সদর' } },
          { id: 'niamatpur', name: { en: 'Niamatpur', bn: 'নিয়ামতপুর' } },
          { id: 'patnitala', name: { en: 'Patnitala', bn: 'পত্নীতলা' } },
          { id: 'porsha', name: { en: 'Porsha', bn: 'পোরশা' } },
          { id: 'raninagar', name: { en: 'Raninagar', bn: 'রাণীনগর' } },
          { id: 'sapahar', name: { en: 'Sapahar', bn: 'সাপাহার' } },
        ],
      },
      { id: 'natore', name: { en: 'Natore', bn: 'নাটোর' }, lat: 24.41, lon: 89.0 },
      { id: 'pabna', name: { en: 'Pabna', bn: 'পাবনা' }, lat: 24.0, lon: 89.24 },
      { id: 'rajshahi', name: { en: 'Rajshahi', bn: 'রাজশাহী' }, lat: 24.37, lon: 88.6 },
      { id: 'sirajganj', name: { en: 'Sirajganj', bn: 'সিরাজগঞ্জ' }, lat: 24.45, lon: 89.7 },
    ],
  },
  {
    id: 'rangpur',
    name: { en: 'Rangpur', bn: 'রংপুর' },
    districts: [
      {
        id: 'dinajpur',
        name: { en: 'Dinajpur', bn: 'দিনাজপুর' },
        lat: 25.63,
        lon: 88.64,
        upazilas: [
          { id: 'birampur', name: { en: 'Birampur', bn: 'বিরামপুর' } },
          { id: 'birganj', name: { en: 'Birganj', bn: 'বীরগঞ্জ' } },
          { id: 'biral', name: { en: 'Biral', bn: 'বিরল' } },
          { id: 'bochaganj', name: { en: 'Bochaganj', bn: 'বোচাগঞ্জ' } },
          { id: 'chirirbandar', name: { en: 'Chirirbandar', bn: 'চিরিরবন্দর' } },
          { id: 'dinajpur-sadar', name: { en: 'Dinajpur Sadar', bn: 'দিনাজপুর সদর' } },
          { id: 'fulbari-dinajpur', name: { en: 'Fulbari', bn: 'ফুলবাড়ী' } },
          { id: 'ghoraghat', name: { en: 'Ghoraghat', bn: 'ঘোড়াঘাট' } },
          { id: 'hakimpur', name: { en: 'Hakimpur', bn: 'হাকিমপুর' } },
          { id: 'kaharole', name: { en: 'Kaharole', bn: 'কাহারোল' } },
          { id: 'khansama', name: { en: 'Khansama', bn: 'খানসামা' } },
          { id: 'nawabganj-dinajpur', name: { en: 'Nawabganj', bn: 'নবাবগঞ্জ' } },
          { id: 'parbatipur', name: { en: 'Parbatipur', bn: 'পার্বতীপুর' } },
        ],
      },
      { id: 'gaibandha', name: { en: 'Gaibandha', bn: 'গাইবান্ধা' }, lat: 25.33, lon: 89.53 },
      { id: 'kurigram', name: { en: 'Kurigram', bn: 'কুড়িগ্রাম' }, lat: 25.81, lon: 89.64 },
      { id: 'lalmonirhat', name: { en: 'Lalmonirhat', bn: 'লালমনিরহাট' }, lat: 25.92, lon: 89.45 },
      { id: 'nilphamari', name: { en: 'Nilphamari', bn: 'নীলফামারী' }, lat: 25.93, lon: 88.86 },
      { id: 'panchagarh', name: { en: 'Panchagarh', bn: 'পঞ্চগড়' }, lat: 26.34, lon: 88.55 },
      {
        id: 'rangpur',
        name: { en: 'Rangpur', bn: 'রংপুর' },
        lat: 25.75,
        lon: 89.24,
        upazilas: [
          { id: 'badarganj', name: { en: 'Badarganj', bn: 'বদরগঞ্জ' } },
          { id: 'gangachara', name: { en: 'Gangachara', bn: 'গংগাচড়া' } },
          { id: 'kaunia', name: { en: 'Kaunia', bn: 'কাউনিয়া' } },
          { id: 'mithapukur', name: { en: 'Mithapukur', bn: 'মিঠাপুকুর' } },
          { id: 'pirgachha', name: { en: 'Pirgachha', bn: 'পীরগাছা' } },
          { id: 'pirganj-rangpur', name: { en: 'Pirganj', bn: 'পীরগঞ্জ' } },
          { id: 'rangpur-sadar', name: { en: 'Rangpur Sadar', bn: 'রংপুর সদর' } },
          { id: 'taraganj', name: { en: 'Taraganj', bn: 'তারাগঞ্জ' } },
        ],
      },
      { id: 'thakurgaon', name: { en: 'Thakurgaon', bn: 'ঠাকুরগাঁও' }, lat: 26.03, lon: 88.46 },
    ],
  },
  {
    id: 'sylhet',
    name: { en: 'Sylhet', bn: 'সিলেট' },
    districts: [
      { id: 'habiganj', name: { en: 'Habiganj', bn: 'হবিগঞ্জ' }, lat: 24.37, lon: 91.42 },
      { id: 'moulvibazar', name: { en: 'Moulvibazar', bn: 'মৌলভীবাজার' }, lat: 24.48, lon: 91.77 },
      { id: 'sunamganj', name: { en: 'Sunamganj', bn: 'সুনামগঞ্জ' }, lat: 25.07, lon: 91.4 },
      {
        id: 'sylhet',
        name: { en: 'Sylhet', bn: 'সিলেট' },
        lat: 24.9,
        lon: 91.87,
        upazilas: [
          { id: 'balaganj', name: { en: 'Balaganj', bn: 'বালাগঞ্জ' } },
          { id: 'beanibazar', name: { en: 'Beanibazar', bn: 'বিয়ানীবাজার' } },
          { id: 'bishwanath', name: { en: 'Bishwanath', bn: 'বিশ্বনাথ' } },
          { id: 'companiganj-sylhet', name: { en: 'Companiganj', bn: 'কোম্পানীগঞ্জ' } },
          { id: 'fenchuganj', name: { en: 'Fenchuganj', bn: 'ফেঞ্চুগঞ্জ' } },
          { id: 'golapganj', name: { en: 'Golapganj', bn: 'গোলাপগঞ্জ' } },
          { id: 'gowainghat', name: { en: 'Gowainghat', bn: 'গোয়াইনঘাট' } },
          { id: 'jaintiapur', name: { en: 'Jaintiapur', bn: 'জৈন্তাপুর' } },
          { id: 'kanaighat', name: { en: 'Kanaighat', bn: 'কানাইঘাট' } },
          { id: 'sylhet-sadar', name: { en: 'Sylhet Sadar', bn: 'সিলেট সদর' } },
          { id: 'zakiganj', name: { en: 'Zakiganj', bn: 'জকিগঞ্জ' } },
        ],
      },
    ],
  },
];

/**
 * Regions with flood/waterlogging exposure that materially changes advice.
 * Used only to raise the priority of waterlogging warnings, never to claim a
 * flood is happening.
 */
const HAOR_DISTRICTS = ['sunamganj', 'habiganj', 'netrokona', 'kishoreganj', 'brahmanbaria'];
const COASTAL_DISTRICTS = [
  'satkhira', 'khulna', 'bagerhat', 'barguna', 'patuakhali', 'bhola', 'pirojpur',
  'jhalokati', 'barishal', 'noakhali', 'lakshmipur', 'feni', 'coxs-bazar', 'chattogram',
];
const DROUGHT_PRONE_DISTRICTS = [
  'rajshahi', 'chapai-nawabganj', 'naogaon', 'natore', 'joypurhat', 'bogura',
  'dinajpur', 'thakurgaon', 'panchagarh', 'nilphamari',
];

/** Returns the flat public list of divisions with their districts. */
function listRegions() {
  return DIVISIONS.map((division) => ({
    id: division.id,
    name: division.name,
    districts: division.districts.map((district) => ({
      id: district.id,
      name: district.name,
      lat: district.lat,
      lon: district.lon,
      upazilas: district.upazilas || [],
    })),
  }));
}

/** Resolves a division/district/upazila selection into coordinates + labels. */
function resolveLocation({ divisionId, districtId, upazilaId }) {
  const division = DIVISIONS.find((d) => d.id === divisionId);
  if (!division) return null;

  const district = division.districts.find((d) => d.id === districtId);
  if (!district) return null;

  const upazila = (district.upazilas || []).find((u) => u.id === upazilaId) || null;

  return {
    divisionId: division.id,
    divisionName: division.name,
    districtId: district.id,
    districtName: district.name,
    upazilaId: upazila ? upazila.id : null,
    upazilaName: upazila ? upazila.name : null,
    lat: district.lat,
    lon: district.lon,
    // Traits the risk engine uses to weight certain warnings
    traits: {
      haor: HAOR_DISTRICTS.includes(district.id),
      coastal: COASTAL_DISTRICTS.includes(district.id),
      droughtProne: DROUGHT_PRONE_DISTRICTS.includes(district.id),
    },
    label: {
      en: [upazila?.name.en, district.name.en, division.name.en].filter(Boolean).join(', '),
      bn: [upazila?.name.bn, district.name.bn, division.name.bn].filter(Boolean).join(', '),
    },
  };
}

module.exports = {
  listRegions,
  resolveLocation,
  HAOR_DISTRICTS,
  COASTAL_DISTRICTS,
  DROUGHT_PRONE_DISTRICTS,
};
