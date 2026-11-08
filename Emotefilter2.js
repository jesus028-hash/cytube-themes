////V5 complete — sort/filter + admin grid/table drag + importEmotes save
(function () {
    if (window.__emoteSortFull) return;
    window.__emoteSortFull = true;

    var ENRICHED_URL =
        "https://jesus028-hash.github.io/Emotelist/master-enriched.json?v=5";

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
            }, 300);
        }
        return true;
    }

    function sortEmotes(list) {
        var result = list.slice();
        if (sortMode === "custom") {
            return result;
        }
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
        view.forEach(function (e) {
            var n = norm(e.name);
            if (!n || seen[n]) return;
            seen[n] = true;
            out.push({ name: e.name, image: e.image });
        });
        allEmotes().forEach(function (e) {
            var n = norm(e.name);
            if (!n || seen[n]) return;
            seen[n] = true;
            out.push({ name: e.name, image: e.image });
        });
        return out;
    }

    function saveOrderToChannel() {
        if (!isStaff()) {
            alert("Mods/admins only.");
            return;
        }
        if (!window.socket) {
            alert("No socket.");
            return;
        }
        var list = buildImportList();
        if (!list.length) {
            alert("Empty list — aborting.");
            return;
        }
        if (
            !confirm(
                "Replace the channel emote list with this order?\n\n" +
                    list.length +
                    " emotes will be imported.\n" +
                    "Export a backup in Channel Settings first if unsure."
            )
        ) {
            return;
        }
        socket.emit("importEmotes", list);
        console.log("[emote-sort] importEmotes sent", list.length);
        window.__emoteSortActive = false;
        window.__emoteSortView = null;
        originalOrder = [];
        setTimeout(function () {
            rememberOriginalOrder();
            refreshList();
        }, 600);
    }

    function nameFromNode(node) {
        if (!node) return "";
        if (node.getAttribute) {
            var dn = node.getAttribute("data-name");
            if (dn) return dn.trim();
        }
        if (node.tagName === "IMG") {
            return (node.title || node.alt || "").trim();
        }
        var img = node.querySelector && node.querySelector("img");
        if (img) return (img.title || img.alt || "").trim();
        var code = node.querySelector && node.querySelector("code");
        if (code) return code.textContent.trim();
        if (node.cells && node.cells[1]) return node.cells[1].textContent.trim();
        return "";
    }

    function clearDragHandlers(el) {
        el.draggable = false;
        el.ondragstart = null;
        el.ondragover = null;
        el.ondrop = null;
        el.ondragend = null;
        el.style.cursor = "";
        el.style.opacity = "";
        el.style.outline = "";
    }

    function bindDragItem(el) {
        el.draggable = true;
        el.style.cursor = "grab";

        el.ondragstart = function (e) {
            dragFrom = el;
            el.style.opacity = "0.45";
            var n = nameFromNode(el);
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", n);
            }
        };
        el.ondragend = function () {
            el.style.opacity = "1";
            dragFrom = null;
        };
        el.ondragover = function (e) {
            e.preventDefault();
            el.style.outline = "2px dashed #c9a227";
        };
        el.ondragleave = function () {
            el.style.outline = "";
        };
        el.ondrop = function (e) {
            e.preventDefault();
            el.style.outline = "";
            if (!dragFrom || dragFrom === el) return;

            var list = (window.__emoteSortView || getFilteredEmotes()).slice();
            var fromName = norm(nameFromNode(dragFrom));
            var toName = norm(nameFromNode(el));
            if (!fromName || !toName) {
                console.warn("[emote-sort] drag: missing names", fromName, toName);
                return;
            }
            var fromIndex = -1;
            var toIndex = -1;
            list.forEach(function (em, i) {
                if (norm(em.name) === fromName) fromIndex = i;
                if (norm(em.name) === toName) toIndex = i;
            });
            if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
                console.warn("[emote-sort] drag: index fail", fromName, toName);
                return;
            }
            var item = list.splice(fromIndex, 1)[0];
            list.splice(toIndex, 0, item);
            sortMode = "custom";
            applyList(list);
        };
    }

    function enableEmoteDrag(on) {
        dragEnabled = !!on;

        var table = document.querySelector(
            "#emotelist table.emotelist-table tbody, .emotelist-table tbody"
        );
        if (table) {
            var rows = table.querySelectorAll("tr");
            Array.prototype.forEach.call(rows, function (row) {
                if (!on) clearDragHandlers(row);
                else bindDragItem(row);
            });
            console.log("[emote-sort] table drag", on ? "on" : "off", rows.length);
            if (rows.length) return;
        }

        var root =
            document.querySelector("#emotelist") ||
            document.querySelector(".emotelist");
        if (!root) {
            console.warn("[emote-sort] emote list root not found");
            return;
        }

        var imgs = root.querySelectorAll("img");
        var tiles = [];
        Array.prototype.forEach.call(imgs, function (img) {
            var el =
                img.closest("a, button, .emote, [data-name], td, li, div") || img;
            if (tiles.indexOf(el) === -1) tiles.push(el);
        });

        tiles.forEach(function (el) {
            if (!on) clearDragHandlers(el);
            else bindDragItem(el);
        });
        console.log("[emote-sort] grid drag", on ? "on" : "off", tiles.length);
    }

    function makeButton(text, callback) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.className = "btn btn-default";
        button.style.cssText = "cursor:pointer;height:100%;font:inherit;";
        button.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            callback();
        };
        return button;
    }

    function makeDropdown(title, parent) {
        var wrap = document.createElement("span");
        wrap.style.cssText =
            "display:inline-block;position:relative;vertical-align:top;";
        var menu;
        var button = makeButton(title + " ▾", function () {
            menu.style.display =
                menu.style.display === "none" ? "block" : "none";
        });
        wrap.appendChild(button);
        menu = document.createElement("div");
        menu.style.cssText =
            "display:none;position:absolute;top:100%;left:0;" +
            "min-width:240px;max-height:340px;overflow:auto;" +
            "padding:10px;background:#292929;color:#eee;" +
            "border:1px solid #666;border-radius:6px;" +
            "z-index:100000;box-shadow:0 4px 12px #000;";
