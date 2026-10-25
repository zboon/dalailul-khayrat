/* Everything under Additional Praises. */
const PRAISE_SECTIONS = [
  { id:'nasheeds', ar:'أناشيد',         en:'Nasheeds',   desc:'Devotional songs in praise of the Prophet ﷺ.' },
  { id:'qasidas',  ar:'قصائد',          en:'Qasidas',    desc:'Poems in praise of the Prophet ﷺ.' },
  { id:'ilahis',   ar:'الإلهيات',        en:'Ilahis',     desc:'Devotional songs in Turkish, with translation.' },
  { id:'qawwalis', ar:'قوالي',           en:'Qawwalis',   desc:'Sufi devotional music in praise of the Prophet ﷺ.' },
];


const MAWLID_COLLECTIONS = [
  { id:'mawlid',   ar:'مولد الدّيبعي',  en:'Mawlid ad-Daybaʿi',  desc:'The mawlid of Imam ad-Daybaʿī — read straight through, in order.' },
  { id:'barzanji', ar:'مولد الْبرزنجي', en:'Mawlid al-Barzanjī', desc:'The most widely recited mawlid in the world, with the qiyām at the birth.' },
  { id:'diya',     ar:'الضياء اللّامع', en:'The Shimmering Light', desc:'Al-Ḥabīb ʿUmar bin Ḥafīẓ’s mawlid, in verse throughout, with the qiyām at the birth.' },
  { id:'burdah',   ar:'قصيدة الْبردة',  en:'Qasida Burdah',       desc:"Imam al-Būṣīrī’s celebrated poem, with audio for every chapter." },
];

/* Bumped with sw.js on every release. Shown small at the foot of the home page
   so you can tell at a glance which build a given phone is actually running. */
const APP_VERSION = '{{version}}';
/* Where the home-page feedback button sends corrections. Change to your address. */
const FEEDBACK_EMAIL = 'zayd.boon@gmail.com';

/* A very small build stamp: 'v110' shows as 'v11.0' (dot before the last digit),
   so you can tell at a glance which build a phone is running. Hidden on the
   Turkish Ilahis page and nowhere else. */
function versionTag(){
  /* The Mawalid app hides this on all but the Ilahis tab; this edition has
     no such tab, so it would never appear at all. Show it on the home page,
     which is what the comment above always claimed. */
  if(state.tab !== 'home') return '';
  const n = APP_VERSION.replace(/^v/, '');
  /* The point sits after the first digit: 151 shows as 1.51, 21 as 2.1. */
  const shown = n.length > 1 ? n.slice(0, 1) + '.' + n.slice(1) : n;
  return `<div class="build-tag">v${shown}</div>`;
}

const TABS = [
  { id:'dalail',   label:'Dalāʾil al-Khayrāt',  ar:'دلائل الْخيرات' },
  { id:'litanies', label:'Al-Aḥzāb',      ar:'الْأَحْزَابُ' },
];

/* A hub tab stays highlighted while you're inside any of its sections. */
const TAB_CHILDREN = {
  dalail:  ['before','downloads'],
  litanies: ['azam','istighfar'],
};

function tabIsActive(id){
  return state.tab === id || (TAB_CHILDREN[id] || []).indexOf(state.tab) !== -1;
}

