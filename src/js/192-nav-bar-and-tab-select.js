function navBar(){
  return `<nav class="tabbar">${TABS.map(t=>`
    <button class="tab ${tabIsActive(t.id)?'active':''}" onclick="selectTab('${t.id}')">
      <span class="tab-en">${t.label}</span>
      <span class="tab-ar">${t.ar}</span>
    </button>`).join('')}</nav>`;
}

function selectTab(id){
  setImmersive(false);
  leftTheLeader();
  state.tab = id;
  state.query = '';
  state.burdahChapter = null;
  renderIndex();
  pushLoc();
}

/* Cards for a given group, honoring the search query. */
