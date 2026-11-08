////V6 complete — filter/sort + multi-select drag + importEmotes
(function () {
    if (window.__emoteSortFull) return;
    window.__emoteSortFull = true;

    var ENRICHED_URL =
        "https://jesus028-hash.github.io/Emotelist/master-enriched.json?v=6";

    var metaByName = Object.create(null);
    var sourceList = [];
    var metaReady = false;
    var controlscontrolsReady = false;
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
    var selectedNames = Object.create(null);

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
        try {
            if (EMOTELIST.searchbar) EMOTELIST.searchbar.val("");
            var search = document.querySelector("input.emotelist-search");
            if (search) search.value = "";
        } catch (_) {}
        EMOTELIST.handleChange();
        console.log("[emote-sort] applied", list.length, "mode:", sortMode);
        setTimeout(function () {
            stampTileNames();
            if (dragEnabled) enableEmoteDrag(true);
            paintSelection();
        }, 300);
        return true;
    }

    function sortEmotes(list) {
        var result = list.slice();
        if (sortMode === "custom") return result;
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
                    "Export a backup first if unsure."
            )
        ) {
            return;
        }
        socket.emit("importEmotes", list);
        console.log("[emote-sort] importEmotes sent", list.length);
        window.__emoteSortActive = false;
        window.__emoteSortView = null;
        originalOrder = [];
        sortMode = "date";
        setTimeout(function () {
            rememberOriginalOrder();
            refreshList();
        }, 600);
    }

    function stampTileNames() {
        var root = document.querySelector("#emotelist");
        if (!root || !window.__emoteSortView) return;
        var list = window.__emoteSortView;
        var imgs = root.querySelectorAll("img");
        var page = typeof EMOTELIST.page === "number" ? EMOTELIST.page : 0;
        var per =
            EMOTELIST._itemsPerPage ||
            EMOTELIST.itemsPerPage ||
            imgs.length ||
            25;
        var start = page * per;
        Array.prototype.forEach.call(imgs, function (img, i) {
            var em = list[start + i];
            if (!em) return;
            img.setAttribute("data-emote-name", em.name);
            var el =
                img.closest("a, button, .emote, [data-name], td, li, div") ||
                img;
            el.setAttribute("data-emote-name", em.name);
        });
    }

    function nameFromNode(node) {
        if (!node) return "";
        var n =
            node.getAttribute && node.getAttribute("data-emote-name");
        if (n) return n.trim();
        if (node.tagName === "IMG") {
            n = node.getAttribute("data-emote-name");
            if (n) return n.trim();
            return (node.title || node.alt || "").trim();
        }
        var img = node.querySelector && node.querySelector("img");
        if (img) {
            n = img.getAttribute("data-emote-name");
            if (n) return n.trim();
            return (img.title || img.alt || "").trim();
        }
        var code = node.querySelector && node.querySelector("code");
        if (code) return code.textContent.trim();
        return "";
    }

    function clearSelection() {
        selectedNames = Object.create(null);
        paintSelection();
    }

    function toggleSelect(name, additive) {
        name = norm(name);
        if (!name) return;
        if (!additive) {
            selectedNames = Object.create(null);
            selectedNames[name] = true;
        } else if (selectedNames[name]) {
            delete selectedNames[name];
        } else {
            selectedNames[name] = true;
        }
        paintSelection();
    }

    function paintSelection() {
        var root = document.querySelector("#emotelist");
        if (!root) return;
        Array.prototype.forEach.call(root.querySelectorAll("img"), function (img) {
            var el =
                img.closest("a, button, .emote, td, li, div") || img;
            var n = norm(nameFromNode(el));
            el.style.outline = selectedNames[n] ? "2px solid #ffd700" : "";
        });
    }

    function moveSelectionTo(targetName) {
        targetName = norm(targetName);
        var list = (window.__emoteSortView || getFilteredEmotes()).slice();
        var keys = Object.keys(selectedNames);
        if (!keys.length) return false;

        var moving = [];
        var rest = [];
        list.forEach(function (e) {
            if (selectedNames[norm(e.name)]) moving.push(e);
            else rest.push(e);
        });
        if (!moving.length) return false;

        var insertAt = rest.findIndex(function (e) {
            return norm(e.name) === targetName;
        });
        if (insertAt < 0) insertAt = rest.length;

        var next = rest.slice(0, insertAt).concat(moving, rest.slice(insertAt));
        sortMode = "custom"; // do not let date/plex resort after drag
        applyList(next);
        console.log(
            "[emote-sort] moved",
            moving.length,
            "→ before",
            targetName
        );
        return true;
    }

    function clearDragHandlers(el) {
        el.draggable = false;
        el.ondragstart = null;
        el.ondragover = null;
        el.ondrop = null;
        el.ondragend = null;
        el.ondragleave = null;
        el.onclick = null;
        el.style.cursor = "";
        el.style.opacity = "";
        if (!selectedNames[norm(nameFromNode(el))]) {
            el.style.outline = "";
        }
    }

    function bindDragItem(el) {
        el.draggable = true;
        el.style.cursor = "grab";

        el.onclick = function (e) {
            if (!dragEnabled || !isStaff()) return;
            e.preventDefault();
            e.stopPropagation();
            toggleSelect(nameFromNode(el), e.ctrlKey || e.metaKey);
        };

        el.ondragstart = function (e) {
            dragFrom = el;
            el.style.opacity = "0.45";
            var n = nameFromNode(el);
            if (!Object.keys(selectedNames).length) {
                selectedNames = Object.create(null);
                if (n) selectedNames[norm(n)] = true;
                paintSelection();
            } else if (n && !selectedNames[norm(n)]) {
                selectedNames = Object.create(null);
                selectedNames[norm(n)] = true;
                paintSelection();
            }
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", n || "");
            }
        };
        el.ondragend = function () {
            el.style.opacity = "1";
            dragFrom = null;
        };
        el.ondragover = function (e) {
            e.preventDefault();
            el.style.boxShadow = "0 0 0 2px #c9a227";
        };
        el.ondragleave = function () {
            el.style.boxShadow = "";
        };
        el.ondrop = function (e) {
            e.preventDefault();
            el.style.boxShadow = "";
            if (!dragFrom || dragFrom === el) return;
            var target = nameFromNode(el);
            if (!target) {
                console.warn("[emote-sort] drop: no target name");
                return;
            }
            moveSelectionTo(target);
        };
    }

    function enableEmoteDrag(on) {
        dragEnabled = !!on;
        stampTileNames();

        var root = document.querySelector("#emotelist");
        if (!root) {
            console.warn("[emote-sort] #emotelist not found");
            return;
        }

        var table = root.querySelector("table.emotelist-table tbody");
        if (table && table.querySelectorAll("tr").length) {
            var rows = table.querySelectorAll("tr");
            Array.prototype.forEach.call(rows, function (row) {
                if (!on) clearDragHandlers(row);
                else bindDragItem(row);
            });
            console.log("[emote-sort] table drag", on ? "on" : "off", rows.length);
            return;
        }

        var imgs = root.querySelectorAll("img");
        var tiles = [];
        Array.prototype.forEach.call(imgs, function (img) {
            var el =
                img.closest("a, button, .emote, [data-name], td, li, div") ||
                img;
            if (tiles.indexOf(el) === -1) tiles.push(el);
        });
        tiles.forEach(function (el) {
            if (!on) clearDragHandlers(el);
            else bindDragItem(el);
        });
        console.log("[emote-sort] grid drag", on ? "on" : "off", tiles.length);
        paintSelection();
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

    function savePlexOrder() {
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
            if (plexOrder.indexOf(source) === -1) plexOrder.push(source);
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
            "flex:0 0 auto;min-width:max-content;z-index:2;";
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
            toggleParent.style.setProperty("overflow", "visible", "important");
            toggleParent.style.setProperty("flex-wrap", "wrap", "important");
            anchor.insertAdjacentElement("afterend", toggle);
        } else {
            document.body.appendChild(toggle);
        }
        advancedToggleReady = true;
        return true;
    }

    function placeControls() {
        if (!metaReady || !window.EMOTELIST) return false;
        if (document.getElementById("emote-sort-controls")) {
            controlsReady = true;
            placeAdvancedToggle(document.getElementById("emote-sort-controls"));
            return true;
        }
        var candidates = Array.from(
            document.querySelectorAll(".nav-tabs, #emotelist-tabs, .nav")
        );
        var tabs = candidates.find(function (element) {
            return Array.from(element.querySelectorAll("a, button")).some(
                function (item) {
                    return item.textContent.trim().toLowerCase() === "favorites";
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
            "display:inline-flex;align-items:center;gap:4px;position:relative;vertical-align:top;";

        var filter = makeDropdown("Show/Hide Plex", host);
        var filterChecks = [];

        function updateFilterButton() {
            var count = filterChecks.filter(function (c) {
                return c.checked;
            }).length;
            filter.button.textContent =
                count === sourceList.length
                    ? "Show/Hide Plex ▾"
                    : "Show/Hide Plex (" + count + "/" + sourceList.length + ") ▾";
        }

        sourceList.forEach(function (source) {
            var label = document.createElement("label");
            label.style.cssText =
                "display:flex;align-items:center;gap:8px;padding:5px 3px;margin:0;cursor:pointer;font-weight:normal;white-space:nowrap;";
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
                if (sortMode === "custom") sortMode = "date";
                refreshList();
            });
            var t = document.createElement("span");
            t.textContent = source;
            label.appendChild(checkbox);
            label.appendChild(t);
            filter.menu.appendChild(label);
            filterChecks.push(checkbox);
        });

        addDivider(filter.menu);
        addMenuAction(filter.menu, "Select all", function () {
            filterChecks.forEach(function (c) {
                c.checked = true;
            });
            selectedSources = filterChecks.map(function (c) {
                return c.value;
            });
            updateFilterButton();
            refreshList();
        });
        addMenuAction(filter.menu, "Clear", function () {
            filterChecks.forEach(function (c) {
                c.checked = false;
            });
            selectedSources = [];
            updateFilterButton();
            refreshList();
        });
        updateFilterButton();

        var plex = makeDropdown("Sort by Plex", host);
        var dragList = document.createElement("div");
        var draggingSource = null;

        function renderPlexOrder() {
            dragList.innerHTML = "";
            plexOrder.forEach(function (source) {
                var row = document.createElement("div");
                row.draggable = true;
                row.style.cssText =
                    "display:flex;align-items:center;gap:8px;padding:7px;margin:4px 0;border:1px solid #555;border-radius:4px;cursor:grab;user-select:none;";
                var grip = document.createElement("span");
                grip.textContent = "☰";
                var name = document.createElement("span");
                name.textContent = source;
                name.style.flex = "1";
                row.appendChild(grip);
                row.appendChild(name);
                row.addEventListener("dragstart", function (event) {
                    draggingSource = source;
                    row.style.opacity = "0.4";
                    if (event.dataTransfer) {
                        event.dataTransfer.setData("text/plain", source);
                    }
                });
                row.addEventListener("dragend", function () {
                    row.style.opacity = "1";
                    draggingSource = null;
                });
                row.addEventListener("dragover", function (event) {
                    event.preventDefault();
                });
                row.addEventListener("drop", function (event) {
                    event.preventDefault();
                    var from =
                        draggingSource ||
                        (event.dataTransfer &&
                            event.dataTransfer.getData("text/plain"));
                    var fromIndex = plexOrder.indexOf(from);
                    var toIndex = plexOrder.indexOf(source);
                    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex)
                        return;
                    plexOrder.splice(fromIndex, 1);
                    plexOrder.splice(toIndex, 0, from);
                    rebuildSourceIndex();
                    savePlexOrder();
                    renderPlexOrder();
                    sortMode = "plex";
                    refreshList();
                });
                dragList.appendChild(row);
            });
        }

        plex.menu.appendChild(dragList);
        renderPlexOrder();
        addDivider(plex.menu);
        addMenuAction(plex.menu, "Apply Plex order", function () {
            sortMode = "plex";
            refreshList();
            plex.menu.style.display = "none";
        });
        addMenuAction(plex.menu, "Reset sort order", function () {
            sortMode = "date";
            clearSelection();
            selectedSources = sourceList.slice();
            filterChecks.forEach(function (checkbox) {
                checkbox.checked = true;
            });
            updateFilterButton();
            refreshList();
            plex.menu.style.display = "none";
        });

        host.appendChild(
            makeButton("Newest", function () {
                sortMode = "date";
                clearSelection();
                refreshList();
            })
        );
        host.appendChild(
            makeButton("All", function () {
                selectedSources = sourceList.slice();
                sortMode = "date";
                clearSelection();
                filterChecks.forEach(function (checkbox) {
                    checkbox.checked = true;
                });
                updateFilterButton();
                refreshList();
            })
        );

        if (isStaff()) {
            host.appendChild(
                makeButton("Drag emotes", function () {
                    enableEmoteDrag(!dragEnabled);
                    alert(
                        dragEnabled
                            ? "Drag ON.\n• Click = select\n• Ctrl+click = multi\n• Drag onto another emote to move\n• Then Save order"
                            : "Drag OFF"
                    );
                })
            );
            host.appendChild(
                makeButton("Save order", function () {
                    saveOrderToChannel();
                })
            );
        }

        favItem.parentElement.insertBefore(host, favItem.nextSibling);
        host.style.display = "none";
        placeAdvancedToggle(host);
        controlsReady = true;
        console.log("[emote-sort] controls added");
        return true;
    }

    function applyDefaultWhenReady() {
        if (
            defaultApplied ||
            !metaReady ||
            !window.EMOTELIST ||
            !window.CHANNEL ||
            !Array.isArray(CHANNEL.emotes)
        ) {
            return;
        }
        rememberOriginalOrder();
        ensurePatch();
        sortMode = "date";
        selectedSources = sourceList.slice();
        if (refreshList()) {
            defaultApplied = true;
            console.log("[emote-sort] default date order applied");
        }
    }

    fetch(ENRICHED_URL, { cache: "no-store" })
        .then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.text();
        })
        .then(function (text) {
            var fixed = text.replace(/,\s*]/g, "]");
            var list = JSON.parse(fixed);
            var sources = Object.create(null);
            (list || []).forEach(function (emote) {
                if (!emote || !emote.name) return;
                metaByName[norm(emote.name)] = {
                    source: emote.source || "",
                    added: emote.added || ""
                };
                if (emote.source) sources[emote.source] = true;
            });
            sourceList = Object.keys(sources).sort();
            loadOrder();
            selectedSources = sourceList.slice();
            metaReady = true;
            window.metaByName = metaByName;
            console.log(
                "[emote-sort] metadata loaded",
                Object.keys(metaByName).length,
                sourceList
            );
            placeControls();
            applyDefaultWhenReady();
        })
        .catch(function (error) {
            console.warn("[emote-sort] metadata failed", error);
            sourceList = ["The-Kinoplex", "Eggplex", "Holyplex"];
            loadOrder();
            selectedSources = sourceList.slice();
            metaReady = true;
            placeControls();
            applyDefaultWhenReady();
        });

    var retry = setInterval(function () {
        placeControls();
        applyDefaultWhenReady();
        if (controlsReady && defaultApplied) clearInterval(retry);
    }, 600);

    var lastEmoteSignature = "";
    setInterval(function () {
        if (!metaReady || !window.CHANNEL || !Array.isArray(CHANNEL.emotes))
            return;
        var signature = allEmotes()
            .map(function (e) {
                return norm(e.name);
            })
            .join("|");
        if (!lastEmoteSignature) {
            lastEmoteSignature = signature;
            return;
        }
        if (signature !== lastEmoteSignature) {
            lastEmoteSignature = signature;
            // Never auto-resort while user is arranging
            if (sortMode !== "custom" && !dragEnabled) {
                refreshList();
            }
        }
    }, 2000);

    console.log("[emote-sort] ready v6-complete");
})();
