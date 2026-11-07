(function () {
  if (window.__remoteEmoteMergeV6) return;
  window.__remoteEmoteMergeV6 = true;

  // Remote list (loaded first)
  var EMOTE_LIST_URL =
    "https://raw.githubusercontent.com/jesus028-hash/Emotelist/main/Robert+Multiplex_combined.txt";

  var MIN_RANK = 2; // mod+

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

  function packEmote(e) {
    if (!e) return null;
    var name = String(e.name || "").trim();
    var image = String(e.image || "").trim();
    if (!name || !image) return null;

    var source =
      typeof e.source === "string" && e.source.trim()
        ? e.source.trim()
        : escapeRe(name);

    try {
      new RegExp(source, "gi");
    } catch (_) {
      source = escapeRe(name);
    }

    return { name: name, image: image, source: source };
  }

  function packList(list) {
    var out = [];
    var seen = Object.create(null);
    (list || []).forEach(function (e) {
      var p = packEmote(e);
      if (!p) return;
      var key = p.name.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(p);
    });
    return out;
  }

  // Remote first, channel-only names last
  function mergeLists(existing, incoming) {
    var byName = Object.create(null);
    var out = [];

    function add(e) {
      var p = packEmote(e);
      if (!p) return;
      var key = p.name.toLowerCase();
      if (byName[key]) return;
      byName[key] = true;
      out.push(p);
    }

    (incoming || []).forEach(add); // remote → front
    (existing || []).forEach(add); // local-only → end
    return out;
  }

  function currentEmotes() {
    if (window.__emoteSortOriginal && Array.isArray(window.__emoteSortOriginal)) {
      return window.__emoteSortOriginal.slice();
    }
    if (window.CHANNEL && Array.isArray(CHANNEL.emotes)) {
      return CHANNEL.emotes.slice();
    }
    return [];
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

    var beforeRaw = currentEmotes();
    var beforePacked = packList(beforeRaw);

    fetch(EMOTE_LIST_URL + "?t=" + Date.now(), { cache: "no-store", mode: "cors" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        var remote = packList(JSON.parse(text));
        var combined = mergeLists(beforePacked, remote);

        applyLocal(combined);
        importOfficial(combined);

        alert(
          "Merged (remote first)\n" +
            "Was on channel: " +
            beforePacked.length +
            "\nRemote: " +
            remote.length +
            "\nChannel-only at end: " +
            (combined.length - remote.length) +
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

  var ICON_SVG =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M12 3v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M8 9l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M5 17.5c0 1.4 1.6 2.5 4 2.5h6c2.4 0 4-1.1 4-2.5S17.4 15 15 15h-.5A5 5 0 0 0 5.5 13.2 3.2 3.2 0 0 0 5 17.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
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
    if (anchor.className) btn.className = anchor.className;
    var cs = window.getComputedStyle(anchor);
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.verticalAlign = "middle";
    btn.style.marginLeft = "6px";
    btn.style.cursor = "pointer";
    btn.style.boxSizing = "border-box";
    if (cs.width && cs.width !== "auto") btn.style.width = cs.width;
    if (cs.height && cs.height !== "auto") btn.style.height = cs.height;
    btn.style.padding = cs.padding;
    btn.style.border = cs.border;
    btn.style.borderRadius = cs.borderRadius;
    btn.style.background = cs.background;
    btn.style.backgroundColor = cs.backgroundColor;
    btn.style.boxShadow = cs.boxShadow;
    btn.style.color = cs.color;
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
    btn.title = "Merge remote emotes (remote first)";
    btn.innerHTML = ICON_SVG;
    copyThemeFrom(anchor, btn);
    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      runMerge();
    };

    if (anchor.nextSibling) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else anchor.parentNode.appendChild(btn);
  }

  placeButton();
  setInterval(placeButton, 2000);
  //v3
})();
