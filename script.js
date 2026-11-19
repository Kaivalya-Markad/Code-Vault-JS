"use strict";

const snippetGrid = document.getElementById("snippetGrid");
const searchInput = document.getElementById("searchInput");
const languageFilter = document.getElementById("languageFilter");
const viewFilter = document.getElementById("viewFilter");
const sortFilter = document.getElementById("sortFilter");

const totalCount = document.getElementById("totalCount");
const favoriteCount = document.getElementById("favoriteCount");
const languageCount = document.getElementById("languageCount");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");

const modalOverlay = document.getElementById("modalOverlay");
const snippetForm = document.getElementById("snippetForm");

const snippetId = document.getElementById("snippetId");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const languageInput = document.getElementById("languageInput");
const tagsInput = document.getElementById("tagsInput");
const codeInput = document.getElementById("codeInput");

const modalTitle = document.getElementById("modalTitle");

const STORAGE_KEY = "codevault_snippets";

let snippets = loadSnippets();

function init() {
    renderSnippets();
    updateStatistics();
    updateLanguageFilter();
}

init();

function loadSnippets() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);

        if (!data) {
            return [];
        }

        const parsedData = JSON.parse(data);

        if (!Array.isArray(parsedData)) {
            return [];
        }

        return parsedData.filter(snippet =>
            snippet &&
            typeof snippet.id === "string" &&
            typeof snippet.title === "string" &&
            typeof snippet.code === "string" &&
            typeof snippet.language === "string"
        );

    } catch (error) {
        console.error("Failed to load snippets:", error);
        return [];
    }
}

function saveSnippets() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(snippets)
        );

    } catch (error) {
        console.error("Failed to save snippets:", error);

        alert(
            "Unable to save snippets. " +
            "Your browser storage may be full."
        );
    }
}

function openModal() {
    modalOverlay.classList.add("active");
    titleInput.focus();
}

function closeModal() {
    modalOverlay.classList.remove("active");
    snippetForm.reset();
    snippetId.value = "";

    modalTitle.textContent = "Create Snippet";
}

document.getElementById("addSnippetBtn")
    .addEventListener("click", openModal);

document.getElementById("emptyAddBtn")
    .addEventListener("click", openModal);

document.getElementById("closeModalBtn")
    .addEventListener("click", closeModal);

document.getElementById("cancelBtn")
    .addEventListener("click", closeModal);

modalOverlay.addEventListener("click", function (event) {
    if (event.target === modalOverlay) {
        closeModal();
    }
});

document.addEventListener("keydown", function (event) {
    if (
        event.key === "Escape" &&
        modalOverlay.classList.contains("active")
    ) {
        closeModal();
    }
});

snippetForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const code = codeInput.value.trim();

    if (!title || !code) {
        alert("Title and code are required.");
        return;
    }

    const tags = tagsInput.value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);

    const existingId = snippetId.value;

    if (existingId) {
        updateSnippet(existingId, {
            title,
            description: descriptionInput.value.trim(),
            language: languageInput.value,
            tags,
            code
        });

    } else {
        createSnippet({
            title,
            description: descriptionInput.value.trim(),
            language: languageInput.value,
            tags,
            code
        });
    }

    closeModal();
});

function createSnippet(data) {
    const newSnippet = {
        id: createId(),
        title: data.title,
        description: data.description,
        language: data.language,
        tags: data.tags,
        code: data.code,
        favorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    snippets.unshift(newSnippet);

    saveSnippets();
    refreshUI();
}

function updateSnippet(id, updatedData) {
    snippets = snippets.map(snippet => {
        if (snippet.id !== id) {
            return snippet;
        }

        return {
            ...snippet,
            ...updatedData,
            updatedAt: new Date().toISOString()
        };
    });

    saveSnippets();
    refreshUI();
}

function createId() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function editSnippet(id) {
    const snippet = snippets.find(item => item.id === id);

    if (!snippet) {
        return;
    }

    snippetId.value = snippet.id;
    titleInput.value = snippet.title;
    descriptionInput.value = snippet.description;
    languageInput.value = snippet.language;
    tagsInput.value = snippet.tags.join(", ");
    codeInput.value = snippet.code;

    modalTitle.textContent = "Edit Snippet";

    openModal();
}

function deleteSnippet(id) {
    const snippet = snippets.find(item => item.id === id);

    if (!snippet) {
        return;
    }

    const confirmed = confirm(
        `Delete "${snippet.title}" permanently?`
    );

    if (!confirmed) {
        return;
    }

    snippets = snippets.filter(item => item.id !== id);

    saveSnippets();
    refreshUI();
}

function toggleFavorite(id) {
    snippets = snippets.map(snippet => {
        if (snippet.id === id) {
            return {
                ...snippet,
                favorite: !snippet.favorite
            };
        }

        return snippet;
    });

    saveSnippets();
    refreshUI();
}

async function copyCode(id) {
    const snippet = snippets.find(item => item.id === id);

    if (!snippet) {
        return;
    }

    try {
        await navigator.clipboard.writeText(snippet.code);

        alert("Code copied to clipboard!");

    } catch (error) {
        console.error("Clipboard error:", error);

        const temporaryTextarea = document.createElement("textarea");

        temporaryTextarea.value = snippet.code;

        document.body.appendChild(temporaryTextarea);

        temporaryTextarea.select();

        const successful = document.execCommand("copy");

        temporaryTextarea.remove();

        if (successful) {
            alert("Code copied to clipboard!");
        } else {
            alert("Unable to copy code.");
        }
    }
}

searchInput.addEventListener("input", renderSnippets);

languageFilter.addEventListener("change", renderSnippets);

viewFilter.addEventListener("change", renderSnippets);

sortFilter.addEventListener("change", renderSnippets);

function getFilteredSnippets() {
    const searchTerm = searchInput.value
        .trim()
        .toLowerCase();

    const selectedLanguage = languageFilter.value;
    const selectedView = viewFilter.value;
    const selectedSort = sortFilter.value;

    let filtered = snippets.filter(snippet => {
        const searchableText = [
            snippet.title,
            snippet.description,
            snippet.language,
            snippet.tags.join(" "),
            snippet.code
        ].join(" ").toLowerCase();

        const matchesSearch =
            searchableText.includes(searchTerm);

        const matchesLanguage =
            selectedLanguage === "all" ||
            snippet.language === selectedLanguage;

        const matchesView =
            selectedView === "all" ||
            snippet.favorite === true;

        return (
            matchesSearch &&
            matchesLanguage &&
            matchesView
        );
    });

    filtered.sort((a, b) => {
        switch (selectedSort) {
            case "oldest":
                return new Date(a.createdAt) -
                    new Date(b.createdAt);

            case "alphabetical":
                return a.title.localeCompare(b.title);

            case "newest":
            default:
                return new Date(b.createdAt) -
                    new Date(a.createdAt);
        }
    });

    return filtered;
}

function renderSnippets() {
    const filteredSnippets = getFilteredSnippets();

    snippetGrid.replaceChildren();

    resultCount.textContent =
        `${filteredSnippets.length} result` +
        `${filteredSnippets.length !== 1 ? "s" : ""}`;

    emptyState.style.display =
        filteredSnippets.length === 0 ? "block" : "none";

    filteredSnippets.forEach(snippet => {
        const card = createSnippetCard(snippet);

        snippetGrid.appendChild(card);
    });
}

function createSnippetCard(snippet) {
    const card = document.createElement("article");

    card.className = "snippet-card";

    if (snippet.favorite) {
        card.classList.add("favorite");
    }

    card.dataset.id = snippet.id;

    const header = document.createElement("div");
    header.className = "card-header";

    const info = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = snippet.title;

    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent =
        snippet.description || "No description provided.";

    info.append(title, description);

    const languageBadge = document.createElement("span");
    languageBadge.className = "language-badge";
    languageBadge.textContent = snippet.language;

    const favoriteButton = document.createElement("button");
    favoriteButton.className = "favorite-btn";

    favoriteButton.textContent =
        snippet.favorite ? "★" : "☆";

    favoriteButton.title = "Toggle favorite";

    if (snippet.favorite) {
        favoriteButton.classList.add("active");
    }

    favoriteButton.dataset.action = "favorite";

    header.append(info, languageBadge, favoriteButton);

    const codeContainer = document.createElement("div");
    codeContainer.className = "code-container";

    const codeBlock = document.createElement("pre");
    codeBlock.className = "code-block";

    const codeElement = document.createElement("code");

    codeElement.textContent = snippet.code;

    codeBlock.appendChild(codeElement);
    codeContainer.appendChild(codeBlock);

    const tagsContainer = document.createElement("div");
    tagsContainer.className = "tags";

    snippet.tags.forEach(tag => {
        const tagElement = document.createElement("span");

        tagElement.className = "tag";
        tagElement.textContent = `#${tag}`;

        tagsContainer.appendChild(tagElement);
    });

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const copyButton = createActionButton("Copy", "copy");
    const editButton = createActionButton("Edit", "edit");
    const deleteButton = createActionButton("Delete", "delete");

    deleteButton.classList.add("delete-btn");

    actions.append(
        copyButton,
        editButton,
        deleteButton
    );

    card.append(
        header,
        codeContainer,
        tagsContainer,
        actions
    );

    return card;
}

function createActionButton(label, action) {
    const button = document.createElement("button");

    button.textContent = label;
    button.dataset.action = action;

    return button;
}

snippetGrid.addEventListener("click", function (event) {
    const button = event.target.closest("button");

    if (!button) {
        return;
    }

    const card = button.closest(".snippet-card");

    if (!card) {
        return;
    }

    const id = card.dataset.id;
    const action = button.dataset.action;

    switch (action) {
        case "copy":
            copyCode(id);
            break;

        case "edit":
            editSnippet(id);
            break;

        case "delete":
            deleteSnippet(id);
            break;

        case "favorite":
            toggleFavorite(id);
            break;
    }
});

function updateLanguageFilter() {
    const languages = [
        ...new Set(
            snippets.map(snippet => snippet.language)
        )
    ].sort();

    const currentValue = languageFilter.value;

    languageFilter.replaceChildren();

    const allOption = document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All Languages";

    languageFilter.appendChild(allOption);

    languages.forEach(language => {
        const option = document.createElement("option");

        option.value = language;
        option.textContent = language;

        languageFilter.appendChild(option);
    });

    if (languages.includes(currentValue)) {
        languageFilter.value = currentValue;
    } else {
        languageFilter.value = "all";
    }
}

function updateStatistics() {
    totalCount.textContent = snippets.length;

    const favorites = snippets.filter(
        snippet => snippet.favorite
    ).length;

    favoriteCount.textContent = favorites;

    const languages = new Set(
        snippets.map(snippet => snippet.language)
    );

    languageCount.textContent = languages.size;
}

function refreshUI() {
    renderSnippets();
    updateStatistics();
    updateLanguageFilter();
}

document.getElementById("exportBtn")
    .addEventListener("click", exportSnippets);

function exportSnippets() {
    if (snippets.length === 0) {
        alert("There are no snippets to export.");
        return;
    }

    const data = JSON.stringify(snippets, null, 2);

    const blob = new Blob(
        [data],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "codevault-backup.json";

    link.click();

    URL.revokeObjectURL(url);
}

const importFile = document.getElementById("importFile");

document.getElementById("importBtn")
    .addEventListener("click", function () {
        importFile.click();
    });

importFile.addEventListener("change", importSnippets);

function importSnippets(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {
        try {
            const importedData = JSON.parse(reader.result);

            if (!Array.isArray(importedData)) {
                throw new Error("Invalid file format.");
            }

            const validSnippets = importedData.filter(snippet =>
                snippet &&
                typeof snippet.title === "string" &&
                typeof snippet.code === "string" &&
                typeof snippet.language === "string"
            );

            if (validSnippets.length === 0) {
                alert("No valid snippets found in this file.");
                return;
            }

            const existingIds = new Set(
                snippets.map(snippet => snippet.id)
            );

            const importedSnippets = validSnippets.map(snippet => ({
                id: existingIds.has(snippet.id)
                    ? createId()
                    : snippet.id || createId(),

                title: snippet.title,
                description: snippet.description || "",
                language: snippet.language,
                tags: Array.isArray(snippet.tags)
                    ? snippet.tags.filter(
                        tag => typeof tag === "string"
                    )
                    : [],
                code: snippet.code,
                favorite: Boolean(snippet.favorite),
                createdAt: snippet.createdAt ||
                    new Date().toISOString(),
                updatedAt: snippet.updatedAt ||
                    new Date().toISOString()
            }));

            snippets = [
                ...importedSnippets,
                ...snippets
            ];

            saveSnippets();
            refreshUI();

            alert(
                `${importedSnippets.length} snippets imported successfully!`
            );

        } catch (error) {
            console.error("Import error:", error);

            alert(
                "Unable to import file. " +
                "Please select a valid CodeVault JSON file."
            );

        } finally {
            importFile.value = "";
        }
    };

    reader.onerror = function () {
        alert("Unable to read the selected file.");
        importFile.value = "";
    };

    reader.readAsText(file);
}
