////V4 + admin drag/save
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
        // rank 2 = mod, 3 = admin, 4+ = owner — change to >= 3 for admin-only
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
            if (EMOTELIST.searchbar) {
                EMOTELIST.searchbar.val("");
            }
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
            // keep list order as-is (after drag)
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
        view.forEach(function (e) {
            var n = norm(e.name);
            if (!n || seen[n]) return;
            seen[n] = true;
            out.push({ name: e.name, image: e.image });
        });
        // Keep emotes not in the current view so filters don't wipe rooms
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

    function rowName(row) {
        var code = row.querySelector("code");
        if (code) return code.textContent.trim();
        if (row.cells && row.cells[1]) return row.cells[1].textContent.trim();
        var title = row.querySelector("[title]");
        if (title) return title.getAttribute("title") || "";
        return (row.textContent || "").trim().split(/\s+/)[0] || "";
    }

    function enableEmoteDrag(on) {
        dragEnabled = !!on;
        var table = document.querySelector(
            "#emotelist table.emotelist-table tbody, .emotelist-table tbody"
        );
        if (!table) {
            if (on) {
                console.warn(
                    "[emote-sort] no emote table found for drag (open emote list)"
                );
            }
            return;
        }

        Array.prototype.forEach.call(table.querySelectorAll("tr"), function (row) {
            if (!on) {
                row.draggable = false;
                row.ondragstart = null;
                row.ondragover = null;
                row.ondrop = null;
                row.ondragend = null;
                row.style.cursor = "";
                row.style.opacity = "";
                return;
            }

            row.draggable = true;
            row.style.cursor = "grab";

            row.ondragstart = function (e) {
                dragFrom = row;
                row.style.opacity = "0.4";
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", rowName(row));
                }
            };
            row.ondragend = function () {
                row.style.opacity = "1";
                dragFrom = null;
            };
            row.ondragover = function (e) {
                e.preventDefault();
            };
            row.ondrop = function (e) {
                e.preventDefault();
                if (!dragFrom || dragFrom === row) return;
                var list = (
                    window.__emoteSortView || getFilteredEmotes()
                ).slice();
                var fromName = norm(rowName(dragFrom));
                var toName = norm(rowName(row));
                var fromIndex = -1;
                var toIndex = -1;
                list.forEach(function (em, i) {
                    if (norm(em.name) === fromName) fromIndex = i;
                    if (norm(em.name) === toName) toIndex = i;
                });
                if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
                    return;
                }
                var item = list.splice(fromIndex, 1)[0];
                list.splice(toIndex, 0, item);
                sortMode = "custom";
                applyList(list);
            };
        });
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
        wrap.appendChild(menu);
        parent.appendChild(wrap);
        menu.onclick = function (event) {
            event.stopPropagation();
        };
        document.addEventListener("click", function (event) {
            if (!wrap.contains(event.target)) {
                menu.style.display = "none";
            }
        });
        return { wrap: wrap, button: button, menu: menu };
    }

    function addMenuAction(menu, text, callback) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-xs btn-default";
        button.textContent = text;
        button.style.margin = "3px";
        button.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            callback();
        };
        menu.appendChild(button);
        return button;
    }

    function addDivider(menu) {
        var divider = document.createElement("div");
        divider.style.cssText = "border-top:1px solid #555;margin:8px 0;";
        menu.appendChild(divider);
    }

    function saveOrder() {
        try {
            localStorage.setItem(
                "emoteSortPlexOrder_v2",
                JSON.stringify(plexOrder)
            );
        } catch (_) {}
    }

    function loadOrder() {
        try {
            var saved = JSON.parse(
                localStorage.getItem("emoteSortPlexOrder_v2") || "null"
            );
            if (Array.isArray(saved)) {
                plexOrder = saved.filter(function (source) {
                    return (
                        typeof source === "string" &&
                        sourceList.indexOf(source) !== -1
                    );
                });
            }
        } catch (_) {}
        sourceList.forEach(function (source) {
            if (plexOrder.indexOf(source) === -1) {
                plexOrder.push(source);
            }
        });
        rebuildSourceIndex();
    }

    function placeAdvancedToggle(host) {
        if (advancedToggleReady) return true;
        var labels = Array.from(document.querySelectorAll("label"));
        var alphaLabel = labels.find(function (label) {
            return label.textContent
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase()
                .includes("sort alphabetically");
        });
        var anchor = alphaLabel;
        if (!anchor) {
            var candidates = Array.from(
                document.querySelectorAll("input[type='checkbox']")
            );
            var alphaInput = candidates.find(function (input) {
                var nearby = input.parentElement;
                return (
                    nearby &&
                    nearby.textContent
                        .replace(/\s+/g, " ")
                        .trim()
                        .toLowerCase()
                        .includes("sort alphabetically")
                );
            });
            if (alphaInput) anchor = alphaInput.parentElement;
        }
        var toggle = document.createElement("label");
        toggle.id = "emote-sort-advanced-toggle";
        toggle.style.cssText =
            "display:inline-flex;align-items:center;gap:5px;" +
            "margin:0 0 0 12px;padding:2px 6px;cursor:pointer;" +
            "font-weight:normal;white-space:nowrap;vertical-align:middle;" +
            "flex:0 0 auto;min-width:max-content;max-width:none;" +
            "overflow:visible;position:relative;z-index:2;";
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = false;
        checkbox.style.margin = "0";
        var text = document.createElement("span");
        text.textContent = "Advanced Sorting";
        toggle.appendChild(checkbox);
        toggle.appendChild(text);
        checkbox.addEventListener("change", function () {
            if (host) {
                host.style.display = checkbox.checked ? "inline-flex" : "none";
            }
        });
        if (anchor && anchor.parentElement) {
            var toggleParent = anchor.parentElement;
            toggle.style.cssText +=
                "display:inline-flex!important;" +
                "position:static!important;" +
                "flex-shrink:0!important;" +
                "width:max-content!important;" +
                "max-width:none!important;" +
                "margin-left:16px!important;" +
                "clear:none!important;";
            toggleParent.style.setProperty("overflow", "visible", "important");
            toggleParent.style.setProperty("flex-wrap", "wrap", "important");
            toggleParent.style.setProperty("align-items", "center", "important");
            anchor.insertAdjacentElement("afterend", toggle);
        } else {
            var tabs = document.querySelector(
                ".nav-tabs, #emotelist-tabs, .nav"
            );
            if (tabs && tabs.parentElement) {
                tabs.parentElement.insertBefore(toggle, tabs.nextSibling);
            } else {
                document.body.appendChild(toggle);
            }
        }
        advancedToggleReady = true;
        return true;
    }

    function placeControls() {
        if (!metaReady || !window.EMOTELIST) return false;
        if (document.getElementById("emote-sort-controls")) {
            controlsReady = true;
            placeAdvancedToggle(
                document.getElementById("emote-sort-controls")
            );
            return true;
        }
        var candidates = Array.from(
            document.querySelectorAll(".nav-tabs, #emotelist-tabs, .nav")
        );
        var tabs = candidates.find(function (element) {
            return Array.from(element.querySelectorAll("a, button")).some(
                function (item) {
                    return (
                        item.textContent.trim().toLowerCase() === "favorites"
                    );
                }
            );
        });
        if (!tabs) return false;
        var favorites = Array.from(tabs.querySelectorAll("a, button")).find(
            function (item) {
                return item.textContent.trim().toLowerCase() === "favorites";
            }
        );
        if (!favorites) return false;
        var favItem = favorites.closest("li") || favorites.parentElement;
        if (!favItem || !favItem.parentElement) return false;

        var host = document.createElement(
            favItem.tagName.toLowerCase() === "li" ? "li" : "span"
        );
        host.id = "emote-sort-controls";
        host.style.cssText =
            "display:inline-flex;align-items:center;gap:4px;" +
            "position:relative;vertical-align:top;";

        var filter = makeDropdown("Show/Hide Plex", host);
        var filterChecks = [];

        function updateFilterButton() {
            var count = filterChecks.filter(function (checkbox) {
                return checkbox.checked;
            }).length;
            if (count === sourceList.length) {
                filter.button.textContent = "Show/Hide Plex ▾";
            } else {
                filter.button.textContent =
                    "Show/Hide Plex (" +
                    count +
                    "/" +
                    sourceList.length +
                    ") ▾";
            }
        }

        sourceList.forEach(function (source) {
            var label = document.createElement("label");
            label.style.cssText =
                "display:flex;align-items:center;gap:8px;" +
                "padding:5px 3px;margin:0;cursor:pointer;" +
                "font-weight:normal;white-space:nowrap;";
            var checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = source;
            checkbox.style.margin = "0";
            checkbox.checked = selectedSources.indexOf(source) !== -1;
            checkbox.addEventListener("change", function () {
                selectedSources = filterChecks
                    .filter(function (item) {
                        return item.checked;
                    })
                    .map(function (item) {
                        return item.value;
                    });
                updateFilterButton();
                refreshList();
            });
            var text = document.createElement("span");
            text.textContent = source;
            label.appendChild(checkbox);
            label.appendChild(text);
            filter.menu.appendChild(label);
            filterChecks.push(checkbox);
        });

        addDivider(filter.menu);
        addMenuAction(filter.menu, "Select all", function () {
            filterChecks.forEach(function (checkbox) {
                checkbox.checked = true;
            });
            selectedSources = filterChecks.map(function (checkbox) {
                return checkbox.value;
            });
            updateFilterButton();
            refreshList();
        });
        addMenuAction(filter.menu, "Clear", function () {
            filterChecks.forEach(function (checkbox) {
                checkbox.checked = false;
            });
            selectedSources = [];
            updateFilterButton();
            refreshList();
        });
        addMenuAction(filter.menu, "Show all", function () {
            filterChecks.forEach(function (checkbox) {
                checkbox.checked = true;
            });
            selectedSources = filterChecks.map(function (checkbox) {
                return checkbox.value;
            });
            updateFilterButton();
            refreshList();
            filter.menu.style.display = "none";
        });
        updateFilterButton();

        var plex = makeDropdown("Sort by Plex", host);
        var dragList = document.createElement("div");
        var draggingSource = null;

        function renderPlexOrder() {
