(function () {
  if (window.__remoteEmoteMergeV4) return;
  window.__remoteEmoteMergeV4 = true;

  var EMOTE_LIST_URL =
    "https://raw.githubusercontent.com/jesus028-hash/Emotelist/refs/heads/main/The-Kinoplex.txt";
  var MIN_RANK = 2;

  function canImport() {
    try {
      return window.CLIENT && typeof CLIENT.rank === "number" && CLIENT.rank >= MIN_RANK;
    } catch (_) {
      return false;
    }
  }

  function escapeRe(s) {
    return String(s).replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  function normalize(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || !e.image) continue;
      var name = String(e.name || "").trim();
      if (!name) continue;
      out.push({
        name: name,
        image: String(e.image).trim(),
        source: escapeRe(name)
      });
    }
    return out;
  }

  function mergeLists(existing, incoming) {
    var byName = Object.create(null);
    var out = [];
    function add(e) {
      var key = String(e.name).toLowerCase();
      if (byName[key]) return;
      byName[key] = true;
      out.push({
        name: e.name,
        image: e.image,
        source: e.source || escapeRe(e.name)
      });
    }
    (existing || []).forEach(add);
    (incoming || []).forEach(add);
    return out;
  }

  function currentEmotes() {
    return window.CHANNEL && Array.isArray(CHANNEL.emotes)
      ? CHANNEL.emotes.slice()
      : [];
  }

  function applyLocal(list) {
    if (typeof loadEmotes === "function") loadEmotes(list);
    else if (window.CHANNEL) CHANNEL.emotes = list.slice();
    try {
      if (window.EMOTELIST && EMOTELIST.handleChange) EMOTELIST.handleChange();
    } catch (_) {}
  }

  function importOfficial(list) {
    var box = document.getElementById("cs-emotes-exporttext");
    var btn = document.getElementById("cs-emotes-import");
    if (box && btn) {
      box.value = JSON.stringify(list);
      var realConfirm = window.confirm;
      window.confirm = function () {
        return true;
      };
      try {
        btn.click();
      } finally {
        window.confirm = realConfirm;
      }
      return true;
    }
    if (window.socket && socket.emit) {
      socket.emit("importEmotes", list);
      return true;
    }
    return false;
  }

  function runMerge() {
    if (!canImport()) {
      alert("Only mods can import emotes.");
      return;
    }
    var before = currentEmotes();
    var beforeCount = before.length;

    fetch(EMOTE_LIST_URL + "?t=" + Date.now(), { cache: "no-store", mode: "cors" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        var remote = normalize(JSON.parse(text));
        var combined = mergeLists(before, remote);
        applyLocal(combined);
        importOfficial(combined);
        alert(
          "Merged\nWas: " +
            beforeCount +
            "\nRemote: " +
            remote.length +
            "\nAdded: " +
            (combined.length - beforeCount) +
            "\nTotal: " +
            combined.length
        );
      })
      .catch(function (err) {
        alert("Merge failed: " + (err.message || err));
      });
  }

  window.__mergeRemoteEmotes = runMerge;
  window.__importRemoteEmotes = runMerge;

  // Stroke uses currentColor → follows theme / parent button color
  var ICON_SVG =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
    'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M12 3v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M8 9l4 4 4-4" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M5 17.5c0 1.4 1.6 2.5 4 2.5h6c2.4 0 4-1.1 4-2.5S17.4 15 15 15h-.5' +
    'A5 5 0 0 0 5.5 13.2 3.2 3.2 0 0 0 5 17.5z" ' +
    'stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    "</svg>";

  function findGifButton() {
    var nodes = document.querySelectorAll(
      "button, a, input[type='button'], span[role='button'], div[role='button']"
    );
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var t = (el.textContent || el.title || el.getAttribute("aria-label") || "").toLowerCase();
      var id = (el.id || "").toLowerCase();
      var cls = (el.className || "").toString().toLowerCase();
      if (t.indexOf("gif") !== -1 || id.indexOf("gif") !== -1 || cls.indexOf("gif") !== -1) {
        return el;
      }
    }
    return document.getElementById("emotelistbtn") || null;
  }

  function copyThemeFrom(anchor, btn) {
    // Reuse the same classes as the neighboring control when possible
    if (anchor.className) {
      btn.className = anchor.className;
    }

    var cs = window.getComputedStyle(anchor);

    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.verticalAlign = "middle";
    btn.style.flexShrink = "0";
    btn.style.marginLeft = "6px";
    btn.style.cursor = "pointer";
    btn.style.boxSizing = "border-box";

    // Size / shape from the theme button
    var w = cs.width;
    var h = cs.height;
    if (w && w !== "auto") btn.style.width = w;
    if (h && h !== "auto") btn.style.height = h;
    btn.style.minWidth = cs.minWidth;
    btn.style.minHeight = cs.minHeight;
    btn.style.padding = cs.padding;
    btn.style.border = cs.border;
    btn.style.borderRadius = cs.borderRadius;
    btn.style.background = cs.background;
    btn.style.backgroundColor = cs.backgroundColor;
    btn.style.boxShadow = cs.boxShadow;
    btn.style.color = cs.color; // SVG currentColor follows this
    btn.style.opacity = cs.opacity;
  }

  function placeButton() {
    var old = document.getElementById("btn-remote-emote-merge");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (!canImport()) return;

    var anchor = findGifButton();
    if (!anchor || !anchor.parentNode) return;

    var btn = document.createElement("button");
    btn.id = "btn-remote-emote-merge";
    btn.type = "button";
    btn.title = "Merge remote emote list";
    btn.setAttribute("aria-label", "Merge remote emotes");
    btn.innerHTML = ICON_SVG;

    copyThemeFrom(anchor, btn);

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      runMerge();
    };

    if (anchor.nextSibling) {
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    } else {
      anchor.parentNode.appendChild(btn);
    }
  }

  placeButton();
  setInterval(placeButton, 2000);
})();