////V5 + admin drag/save (complete)
(function () {
    if (window.__emoteSortFull) return;
    window.__emoteSortFull = true;

    var ENRICHED_URL =
        "https://jesus028-hash.github.io/Emotelist/master-enriched.json?v=2";

    var metaByName = Object.create(null);
    var sourceList = [];
    var metaReady = false;
    var controlsReady = false;
    var defaultApplied = false;
    var advancedToggleReady = false;
    var selectedSources = [];
    var plexOrder = [];
    var sortMode = "date";
    var originalOrder = [];
    var originalIndexByName = Object.create(null);
    var sourceIndex = Object.create(null);
    var dragEnabled = false;
    var dragFrom = null;

    function norm(name) {
        return String(name || "").trim().toLowerCase();
    }

    function metaFor(name) {
        return metaByName[norm(name)] || { source: "", added: "" };
    }

    function allEmotes() {
        return window.CHANNEL && Array.isArray(CHANNEL.emotes)
            ? CHANNEL.emotes.slice()
            : [];
    }

    function isStaff() {
        return window.CLIENT && CLIENT.rank >= 2;
    }

    function addedTime(emote) {
        var value = metaFor(emote.name).added;
        if (!value) return 0;
        var time = Date.parse(value);
        return isNaN(time) ? 0 : time;
    }

    function rememberOriginalOrder() {
        if (originalOrder.length) return;
        originalOrder = allEmotes();
        originalIndexByName = Object.create(null);
        originalOrder.forEach(function (emote, index) {
            var name = norm(emote.name);
            if (name && originalIndexByName[name] === undefined) {
                originalIndexByName[name] = index;
            }
        });
    }

    function originalIndex(emote) {
        var index = originalIndexByName[norm(emote.name)];
        return index === undefined ? 999999 : index;
    }

    function rebuildSourceIndex() {
        sourceIndex = Object.create(null);
        plexOrder.forEach(function (source, index) {
            sourceIndex[source] = index;
        });
    }

    function ensurePatch() {
        if (!window.EMOTELIST || EMOTELIST.__sortPatched) return;
        EMOTELIST.__sortPatched = true;
        var originalHandleChange = EMOTELIST.handleChange.bind(EMOTELIST);
        EMOTELIST.handleChange = function () {
            var real = CHANNEL.emotes;
            if (window.__emoteSortActive) {
                CHANNEL.emotes = window.__emoteSortView || [];
            }
            try {
                return originalHandleChange();
            } finally {
                CHANNEL.emotes = real;
            }
        };
        console.log("[emote-sort] patched");
    }

    function applyList(list) {
        if (!window.EMOTELIST || !window.CHANNEL) return false;
        ensurePatch();
        window.__emoteSortActive = true;
        window.__emoteSortView = list.slice();
        EMOTELIST.sortAlphabetical = false;
        EMOTELIST.page = 0;
        try {
            if (EMOTELIST.searchbar) EMOTELIST.searchbar.val("");
            var search = document.querySelector("input.emotelist-search");
            if (search) search.value = "";
        } catch (_) {}
        EMOTELIST.handleChange();
        console.log("[emote-sort] applied", list.length, "mode:", sortMode);
        if (dragEnabled) {
            setTimeout(function () {
                enableEmoteDrag(true);
            }, 250);
        }
        return true;
    }

    function sortEmotes(list) {
        var result = list.slice();
        if (sortMode === "plex") {
            result.sort(function (a, b) {
                var sa = metaFor(a.name).source;
                var sb = metaFor(b.name).source;
                var pa = sourceIndex[sa];
                var pb = sourceIndex[sb];
                if (pa === undefined) pa = 999999;
                if (pb === undefined) pb = 999999;
                if (pa !== pb) return pa - pb;
                return originalIndex(a) - originalIndex(b);
            });
        } else if (sortMode === "custom") {
            return result;
        } else {
            result.sort(function (a, b) {
                var difference = addedTime(a) - addedTime(b);
                return difference || originalIndex(a) - originalIndex(b);
            });
        }
        return result;
    }

    function getFilteredEmotes() {
        var list = allEmotes();
        var selected = Object.create(null);
        selectedSources.forEach(function (source) {
            selected[source] = true;
        });
        list = list.filter(function (emote) {
            var source = metaFor(emote.name).source;
            if (!source && selected["The-Kinoplex"]) return true;
            return !!selected[source];
        });
        return sortEmotes(list);
    }

    function refreshList() {
        rememberOriginalOrder();
        return applyList(getFilteredEmotes());
    }

    function buildImportList() {
        var view =
            window.__emoteSortView && window.__emoteSortView.length
                ? window.__emoteSortView.slice()
                : getFilteredEmotes();
        var seen = Object.create(null);
        var out = [];
