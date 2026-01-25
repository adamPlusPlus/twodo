const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-XsTijtuR.js","assets/index-CNYkqtwx.css"])))=>i.map(i=>d[i]);
import { B as BasePlugin, D as DOMUtils, S as StringUtils, g as getService, a as SERVICES, _ as __vitePreload } from "./index-XsTijtuR.js";
class SearchFilter extends BasePlugin {
  constructor(app = null, config = {}) {
    super({
      id: "search-filter",
      name: "Search & Filter",
      description: "Global search and filter across all documents and items.",
      type: "page",
      defaultConfig: {
        enabled: true,
        searchHistory: [],
        savedSearches: []
      },
      ...config
    });
    if (app) {
      this.app = app;
    }
    this.searchResults = [];
    this.currentFilters = {};
  }
  async onInit() {
    if (this.config.enabled && this.app && this.app.eventBus) {
      this.injectSearchUI();
      this.app.eventBus.on("element:created", this.handleElementChange.bind(this));
      this.app.eventBus.on("element:updated", this.handleElementChange.bind(this));
      this.app.eventBus.on("element:deleted", this.handleElementChange.bind(this));
    }
  }
  async onDestroy() {
    if (this.app && this.app.eventBus) {
      this.app.eventBus.off("element:created", this.handleElementChange.bind(this));
      this.app.eventBus.off("element:updated", this.handleElementChange.bind(this));
      this.app.eventBus.off("element:deleted", this.handleElementChange.bind(this));
    }
  }
  handleElementChange() {
    if (this.app.searchIndex) {
      this.app.searchIndex.rebuildIndex();
    }
  }
  injectSearchUI() {
    let searchContainer = document.getElementById("global-search-container");
    if (!searchContainer) {
      searchContainer = DOMUtils.createElement("div", {
        id: "global-search-container",
        style: "display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; background: #2a2a2a; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); min-width: 400px; max-width: 600px;"
      });
      document.body.appendChild(searchContainer);
    }
    const searchBtn = document.getElementById("search-btn");
    if (searchBtn && !searchBtn.dataset.searchHandlerAttached) {
      searchBtn.dataset.searchHandlerAttached = "true";
      searchBtn.addEventListener("click", () => {
        const isVisible = searchContainer.style.display !== "none";
        if (isVisible) {
          searchContainer.style.display = "none";
        } else {
          searchContainer.style.display = "block";
          const searchInput = searchContainer.querySelector("#global-search-input");
          if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
          }
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && searchContainer.style.display !== "none") {
          searchContainer.style.display = "none";
        }
      });
      document.addEventListener("click", (e) => {
        if (searchContainer.style.display !== "none" && !searchContainer.contains(e.target) && e.target !== searchBtn) {
          searchContainer.style.display = "none";
        }
      });
    }
    searchContainer.innerHTML = `
            <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                <input type="text" id="global-search-input" placeholder="Search all items..." 
                       style="flex: 1; padding: 8px; background: #1a1a1a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px;" />
                <button id="global-search-btn" style="padding: 8px 15px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer;">Search</button>
                <button id="global-filter-toggle" style="padding: 8px; background: #3a3a3a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; cursor: pointer;" title="Toggle Filters">⚙</button>
            </div>
            <div id="global-filter-panel" style="display: none; margin-top: 10px; padding: 10px; background: #1a1a1a; border-radius: 4px;">
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Tags:</label>
                    <select id="filter-tags" multiple style="width: 100%; padding: 5px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-size: 12px;">
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Type:</label>
                    <select id="filter-type" multiple style="width: 100%; padding: 5px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-size: 12px;">
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <input type="checkbox" id="filter-completed" />
                        <span>Completed</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; margin-top: 5px;">
                        <input type="checkbox" id="filter-has-deadline" />
                        <span>Has Deadline</span>
                    </label>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Page:</label>
                    <select id="filter-page" multiple style="width: 100%; padding: 5px; background: #2a2a2a; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; font-size: 12px;">
                    </select>
                </div>
                <button id="clear-filters-btn" style="width: 100%; padding: 5px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Clear Filters</button>
            </div>
            <div id="search-results-container" style="display: none; margin-top: 10px; max-height: 400px; overflow-y: auto; background: #1a1a1a; border-radius: 4px; padding: 10px;">
                <div id="search-results-list"></div>
            </div>
        `;
    this.setupEventListeners();
    this.populateFilterOptions();
    const closeBtn = searchContainer.querySelector("#search-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        searchContainer.style.display = "none";
      });
    }
  }
  setupEventListeners() {
    const searchInput = document.getElementById("global-search-input");
    const searchBtn = document.getElementById("global-search-btn");
    const filterToggle = document.getElementById("global-filter-toggle");
    const filterPanel = document.getElementById("global-filter-panel");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.performSearch());
    }
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.performSearch();
        }
      });
    }
    if (filterToggle && filterPanel) {
      filterToggle.addEventListener("click", () => {
        filterPanel.style.display = filterPanel.style.display === "none" ? "block" : "none";
      });
    }
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => this.clearFilters());
    }
    const filterTags = document.getElementById("filter-tags");
    const filterType = document.getElementById("filter-type");
    const filterCompleted = document.getElementById("filter-completed");
    const filterHasDeadline = document.getElementById("filter-has-deadline");
    const filterPage = document.getElementById("filter-page");
    if (filterTags) {
      filterTags.addEventListener("change", () => this.applyFilters());
    }
    if (filterType) {
      filterType.addEventListener("change", () => this.applyFilters());
    }
    if (filterCompleted) {
      filterCompleted.addEventListener("change", () => this.applyFilters());
    }
    if (filterHasDeadline) {
      filterHasDeadline.addEventListener("change", () => this.applyFilters());
    }
    if (filterPage) {
      filterPage.addEventListener("change", () => this.applyFilters());
    }
  }
  populateFilterOptions() {
    if (!this.app.searchIndex) return;
    const filterTags = document.getElementById("filter-tags");
    const filterType = document.getElementById("filter-type");
    const filterPage = document.getElementById("filter-page");
    if (filterTags) {
      const tags = this.app.searchIndex.getAllTags();
      filterTags.innerHTML = tags.map(
        (tag) => `<option value="${StringUtils.escapeHtml(tag)}">${StringUtils.escapeHtml(tag)}</option>`
      ).join("");
    }
    if (filterType) {
      const types = this.app.searchIndex.getAllTypes();
      filterType.innerHTML = types.map(
        (type) => `<option value="${StringUtils.escapeHtml(type)}">${StringUtils.escapeHtml(type)}</option>`
      ).join("");
    }
    if (filterPage) {
      const appState = getService(SERVICES.APP_STATE);
      const documents = appState?.documents || [];
      filterPage.innerHTML = documents.map(
        (page) => `<option value="${StringUtils.escapeHtml(page.id)}">${StringUtils.escapeHtml(page.title || page.id)}</option>`
      ).join("");
    }
  }
  applyFilters() {
    const filterTags = document.getElementById("filter-tags");
    const filterType = document.getElementById("filter-type");
    const filterCompleted = document.getElementById("filter-completed");
    const filterHasDeadline = document.getElementById("filter-has-deadline");
    const filterPage = document.getElementById("filter-page");
    this.currentFilters = {};
    if (filterTags && filterTags.selectedOptions.length > 0) {
      this.currentFilters.tags = Array.from(filterTags.selectedOptions).map((opt) => opt.value);
    }
    if (filterType && filterType.selectedOptions.length > 0) {
      this.currentFilters.type = Array.from(filterType.selectedOptions).map((opt) => opt.value);
    }
    if (filterCompleted && filterCompleted.checked) {
      this.currentFilters.completed = true;
    }
    if (filterHasDeadline && filterHasDeadline.checked) {
      this.currentFilters.hasDeadline = true;
    }
    if (filterPage && filterPage.selectedOptions.length > 0) {
      this.currentFilters.pageId = Array.from(filterPage.selectedOptions).map((opt) => opt.value);
    }
    this.performSearch();
  }
  clearFilters() {
    const filterTags = document.getElementById("filter-tags");
    const filterType = document.getElementById("filter-type");
    const filterCompleted = document.getElementById("filter-completed");
    const filterHasDeadline = document.getElementById("filter-has-deadline");
    const filterPage = document.getElementById("filter-page");
    if (filterTags) filterTags.selectedIndex = -1;
    if (filterType) filterType.selectedIndex = -1;
    if (filterCompleted) filterCompleted.checked = false;
    if (filterHasDeadline) filterHasDeadline.checked = false;
    if (filterPage) filterPage.selectedIndex = -1;
    this.currentFilters = {};
    this.performSearch();
  }
  performSearch() {
    const searchInput = document.getElementById("global-search-input");
    const query = searchInput ? searchInput.value.trim() : "";
    const resultsContainer = document.getElementById("search-results-container");
    const resultsList = document.getElementById("search-results-list");
    if (!this.app.searchIndex) {
      console.warn("SearchIndex not available");
      return;
    }
    this.searchResults = this.app.searchIndex.search(query, this.currentFilters);
    if (resultsContainer && resultsList) {
      if (this.searchResults.length === 0) {
        resultsList.innerHTML = '<div style="padding: 10px; color: #888; text-align: center;">No results found</div>';
      } else {
        resultsList.innerHTML = this.searchResults.map((result) => {
          const pageTitle = StringUtils.escapeHtml(result.pageTitle || result.pageId);
          const binTitle = StringUtils.escapeHtml(result.binTitle || result.binId);
          const elementText = StringUtils.escapeHtml(result.text || "Untitled");
          const tags = result.tags.map(
            (tag) => `<span style="background: #4a9eff; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-right: 3px;">${StringUtils.escapeHtml(tag)}</span>`
          ).join("");
          return `
                        <div class="search-result-item" 
                             data-page-id="${StringUtils.escapeHtml(result.pageId)}"
                             data-bin-id="${StringUtils.escapeHtml(result.binId)}"
                             data-element-index="${result.elementIndex}"
                             style="padding: 8px; margin-bottom: 5px; background: #2a2a2a; border-radius: 4px; cursor: pointer; border-left: 3px solid #4a9eff;"
                             onmouseover="this.style.background='#3a3a3a'"
                             onmouseout="this.style.background='#2a2a2a'">
                            <div style="font-weight: bold; margin-bottom: 3px;">${elementText}</div>
                            <div style="font-size: 11px; color: #888; margin-bottom: 3px;">
                                ${pageTitle} → ${binTitle}
                            </div>
                            ${tags ? `<div style="margin-top: 3px;">${tags}</div>` : ""}
                        </div>
                    `;
        }).join("");
        resultsList.querySelectorAll(".search-result-item").forEach((item) => {
          item.addEventListener("click", () => {
            const pageId = item.dataset.pageId;
            const binId = item.dataset.binId;
            const elementIndex = parseInt(item.dataset.elementIndex);
            __vitePreload(async () => {
              const { NavigationHelper } = await import("./index-XsTijtuR.js").then((n) => n.N);
              return { NavigationHelper };
            }, true ? __vite__mapDeps([0,1]) : void 0).then(({ NavigationHelper }) => {
              NavigationHelper.navigateToElement(pageId, binId, elementIndex, this.app, {
                highlightColor: "#4a9eff"
              });
            });
            if (resultsContainer) {
              resultsContainer.style.display = "none";
            }
          });
        });
      }
      resultsContainer.style.display = "block";
    }
    if (query && !this.config.searchHistory.includes(query)) {
      this.config.searchHistory.unshift(query);
      this.config.searchHistory = this.config.searchHistory.slice(0, 10);
      this.updateConfig({ searchHistory: this.config.searchHistory }, true);
    }
  }
}
export {
  SearchFilter as default
};
//# sourceMappingURL=plugin-DnNq-0gy.js.map
