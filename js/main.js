import { coursesData, FILTERS } from "./courses-data.js";

function normalize(text) {
  return text.toLowerCase().trim();
}

function debounce(fn, delay = 300) {
  let timeoutId;

  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

function getCourseCounts(courses) {
  const counts = { all: courses.length };

  courses.forEach((course) => {
    const cat = course.category;
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return counts;
}

function getCourseCountsForQuery(courses, query) {
  const normalized = normalize(query);

  if (!normalized) {
    return getCourseCounts(courses);
  }

  const matchedCourses = courses.filter((course) =>
    normalize(course.title).includes(normalized)
  );

  return getCourseCounts(matchedCourses);
}

function createCourseCard(course, template) {
  const node = template.content.firstElementChild.cloneNode(true);

  node.dataset.category = course.category;
  node.dataset.title = course.title;
  node.classList.add("course-card--loading");

  const img = node.querySelector(".course-card__image");
  img.src = course.image;
  img.alt = course.title;
  img.loading = "lazy";

  img.addEventListener("load", () => {
    node.classList.remove("course-card--loading");
  });

  img.addEventListener("error", () => {
    node.classList.remove("course-card--loading");
  });

  const badge = node.querySelector(".course-card__badge");
  badge.textContent = course.badgeText;
  badge.classList.add(`course-card__badge_theme_${course.badgeTheme}`);

  node.querySelector(".course-card__title").textContent = course.title;
  node.querySelector(".course-card__price").textContent = course.price;
  node.querySelector(".course-card__author").textContent = course.author;

  return node;
}

function renderCourses(gridEl, templateEl, courses) {
  const fragment = document.createDocumentFragment();

  courses.forEach((course) => {
    const card = createCourseCard(course, templateEl);
    fragment.appendChild(card);
  });

  gridEl.appendChild(fragment);

  return Array.from(gridEl.querySelectorAll(".course-card"));
}

function renderFilters(rootEl, filters, counts, activeId) {
  const fragment = document.createDocumentFragment();

  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "filter__item" + (filter.id === activeId ? " filter__item_active" : "");
    button.dataset.filter = filter.id;

    button.append(document.createTextNode(filter.label + " "));

    const countSpan = document.createElement("span");
    countSpan.className = "filter__item-count";
    countSpan.textContent = counts[filter.id] ?? 0;

    button.append(countSpan);
    fragment.appendChild(button);
  });

  rootEl.innerHTML = "";
  rootEl.appendChild(fragment);
}

function getFilteredCards(cards, state) {
  const query = normalize(state.query);

  return cards.filter((card) => {
    const category = card.dataset.category;
    const title = normalize(card.dataset.title || "");

    const matchesFilter =
      state.currentFilter === "all" || category === state.currentFilter;
    const matchesSearch = title.includes(query);

    return matchesFilter && matchesSearch;
  });
}

function updateVisibility({ cards, state, loadMoreBtn }) {
  const filtered = getFilteredCards(cards, state);

  // прячем всё
  cards.forEach((card) => {
    card.style.display = "none";
  });

  // показываем только до лимита
  filtered.slice(0, state.visibleCount).forEach((card) => {
    card.style.display = "";
  });

  // состояние кнопки Load more
  if (loadMoreBtn) {
    if (filtered.length > state.visibleCount) {
      loadMoreBtn.style.display = "";
    } else {
      loadMoreBtn.style.display = "none";
    }
  }
}

function setupFilterHandlers(rootEl, state, deps) {
  rootEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".filter__item");
    if (!btn) return;

    const newFilter = btn.dataset.filter;
    if (!newFilter || newFilter === state.currentFilter) return;

    state.currentFilter = newFilter;
    state.visibleCount = state.initialVisible;

    rootEl
      .querySelectorAll(".filter__item")
      .forEach((b) => b.classList.remove("filter__item_active"));
    btn.classList.add("filter__item_active");

    updateVisibility(deps);
  });
}

function setupSearchHandler(inputEl, filtersRoot, state, deps) {
  if (!inputEl) return;

  const handleInput = debounce((event) => {
    state.query = event.target.value;
    state.visibleCount = state.initialVisible;

    const counts = getCourseCountsForQuery(coursesData, state.query);
    renderFilters(filtersRoot, FILTERS, counts, state.currentFilter);

    updateVisibility(deps);
  }, 300);

  inputEl.addEventListener("input", handleInput);
}

function setupLoadMoreHandler(buttonEl, state, deps) {
  if (!buttonEl) return;

  buttonEl.addEventListener("click", () => {
    state.visibleCount += state.pageSize;
    updateVisibility(deps);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector("[data-courses-grid]");
  const template = document.querySelector("#course-card-template");
  const filtersRoot = document.querySelector("[data-filter-root]");
  const searchInput = document.querySelector("[data-search-input]");
  const loadMoreBtn = document.querySelector("[data-load-more]");
  const searchForm = document.querySelector(".search");

  if (!grid || !template || !filtersRoot) {
    return;
  }

  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (searchInput) {
        searchInput.blur();
      }
    });
  }

  const cards = renderCourses(grid, template, coursesData);

  const counts = getCourseCounts(coursesData);
  renderFilters(filtersRoot, FILTERS, counts, "all");

  const state = {
    initialVisible: 9,
    pageSize: 3,
    currentFilter: "all",
    query: "",
    visibleCount: 9,
  };

  const deps = {
    cards,
    state,
    loadMoreBtn,
  };

  setupFilterHandlers(filtersRoot, state, deps);
  setupSearchHandler(searchInput, filtersRoot, state, deps);
  setupLoadMoreHandler(loadMoreBtn, state, deps);

  updateVisibility(deps);
});
