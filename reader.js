"use strict";
const $ = id => document.getElementById(id);
const MAX_BYTES = 1024 * 1024;
let current = null, activeCode = "JavaScript", codes = {}, requestVersion = 0, controller = null;

    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
    const pretty = value => JSON.stringify(value, null, 2);
    const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
    const list = values => "<ul>" + values.map(value => "<li>" + esc(value) + "</li>").join("") + "</ul>";
    function showError(message) { $("error").textContent = message; $("error").hidden = false; }
    function resetFeedback() { $("error").hidden = true; $("status").textContent = ""; }
    $("marquee-toggle").onclick = () => {
      const paused = $("discovery-strip").dataset.paused !== "true";
      $("discovery-strip").dataset.paused = String(paused);
      $("marquee-toggle").textContent = paused ? "Resume" : "Pause";
      $("marquee-toggle").setAttribute("aria-label",paused ? "Resume moving banner" : "Pause moving banner");
    };
    $("play-request").onclick = () => {
      const button = $("play-request"), playground = $("request-playground");
      const finish = () => {
        playground.dataset.step = "done";
        $("play-status").textContent = 'Pretend 200 OK! Byte brought back {"hello":"world"}.';
        button.disabled = false;
        button.textContent = "Send another tiny request";
      };
      button.disabled = true;
      playground.dataset.step = "request";
      $("play-status").textContent = "Byte is carrying your pretend request...";
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
      setTimeout(() => {
        playground.dataset.step = "server";
        $("play-status").textContent = "The pretend server is preparing a hello...";
      },900);
      setTimeout(finish,1800);
    };
    function applyTheme(theme) {
      if (!["light","dark"].includes(theme)) throw new Error("Unsupported theme preference.");
      document.documentElement.dataset.theme = theme;
      const action = theme === "dark" ? "light" : "dark";
      $("theme-label").textContent = action === "light" ? "Light theme" : "Dark theme";
      $("theme-toggle").setAttribute("aria-label","Switch to " + action + " theme");
      $("theme-toggle").title = "Switch to " + action + " theme";
      $("theme-color").content = theme === "dark" ? "#0d1117" : "#ffffff";
    }
    function initializeTheme() {
      try {
        const theme = localStorage.getItem("api-lens-theme");
        applyTheme(theme || "dark");
      } catch (error) {
        showError("Could not read the theme preference: " + error.message + " You can still change the theme for this page.");
      }
    }
    $("theme-toggle").onclick = () => {
      const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(theme);
      try { localStorage.setItem("api-lens-theme",theme); }
      catch (error) { showError("Theme changed, but the preference could not be saved: " + error.message); }
    };
    function updateNavigation(id) {
      const headerId = ["visualizer-container","quiz-container"].includes(id) ? id : "workspace-input";
      document.querySelectorAll(".workspace-tabs [data-jump], .section-links [data-jump]").forEach(button => {
        const selected = button.dataset.jump === (button.closest(".workspace-tabs") ? headerId : id);
        if (selected) button.setAttribute("aria-current","page");
        else button.removeAttribute("aria-current");
      });
    }
    document.addEventListener("click",event => {
      const button = event.target instanceof Element ? event.target.closest("button[data-jump]") : null;
      if (!button || button.disabled) return;
      const section = $(button.dataset.jump);
      if (!section || section.closest("[hidden]")) return;
      updateNavigation(button.dataset.jump);
      section.tabIndex = -1;
      section.focus({preventScroll:true});
      section.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",block:"start"});
    });
    function focusApiInput() {
      const input = $("api-url");
      updateNavigation("workspace-input");
      input.focus({preventScroll:true});
      input.scrollIntoView({block:"center"});
    }
    $("jump-search").onclick = focusApiInput;
    document.addEventListener("keydown",event => {
      if (event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      const editable = target?.closest("input,textarea,select,[contenteditable=true]");
      if (event.key === "/" && !editable && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); focusApiInput();
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        const form = target?.closest("#url-panel");
        if (form && !form.querySelector("button[type=submit]").disabled) {
          event.preventDefault(); form.requestSubmit();
        }
      }
    });
    async function copyText(text, button) {
      button.textContent = button.id === "copy-endpoint" ? "Copy endpoint" : "Copy";
      try { await navigator.clipboard.writeText(text); button.textContent = "Copied!"; }
      catch (error) { showError("Could not copy to the clipboard: " + error.message + " Select the text and copy it manually."); }
    }
    function cancelRequest() {
      requestVersion++;
      if (controller) controller.abort();
      controller = null;
      document.body.classList.remove("is-loading");
      document.querySelectorAll("button[type=submit]").forEach(button => button.disabled = false);
    }
    function renderQuiz(questions) {
      $("quiz-container").innerHTML = `<article class="card quiz"><h3><span class="number">11</span> Test your understanding</h3><div class="quiz-intro"><p>Five questions built from this URL and response. Reading another URL starts a fresh round.</p><div class="quiz-progress"><span id="quiz-answered">0 of 5 answered</span><div class="progress-track" id="quiz-progress" role="progressbar" aria-label="Quiz questions answered" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"><div class="progress-fill" id="quiz-progress-fill"></div></div></div></div>
        <form id="quiz-form">${questions.map((question,index) => `<fieldset><legend>${index + 1}. ${esc(question.category)} / ${esc(question.prompt)}</legend>${question.options.map((option,optionIndex) => `<label><input type="radio" name="question-${index}" value="${optionIndex}" required><span>${esc(option.text)}</span></label>`).join("")}<p class="feedback" id="feedback-${index}" hidden></p></fieldset>`).join("")}
        <div class="quiz-actions"><button type="submit" class="primary">Check my answers</button><button type="reset" class="pill">Try again</button><span class="quiz-score" id="quiz-score" role="status" aria-live="polite"></span></div></form><div class="quiz-reward" id="quiz-reward" hidden><span class="reward-badge" aria-hidden="true">[*]</span><div><b>Response explorer badge unlocked!</b><p>Perfect round. Stay curious, and keep checking the response.</p></div><span aria-hidden="true">${Array.from({length:10},(_,index) => `<span class="reward-spark" style="--i:${index}">${index % 2 ? "+" : "*"}</span>`).join("")}</span></div></article>`;
      $("quiz-form").onsubmit = event => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        updateProgress(5);
        let score = 0;
        questions.forEach((question,index) => {
          const chosen = Number(new FormData(form).get("question-" + index)), correct = question.options[chosen]?.correct === true;
          if (correct) score++;
          const feedback = $("feedback-" + index);
          form.querySelectorAll("fieldset")[index].dataset.result = correct ? "correct" : "incorrect";
          feedback.hidden = false; feedback.classList.toggle("incorrect",!correct);
          feedback.textContent = (correct ? "Correct. " : "Not quite. Correct answer: " + question.options.find(option => option.correct).text + " ") + question.explanation;
        });
        $("quiz-score").textContent = score + " / 5 correct" + (score === 5 ? ". Perfect round! Response explorer badge unlocked." : "");
        $("quiz-reward").hidden = score !== 5;
      };
      function updateProgress(count) {
        $("quiz-answered").textContent = count + " of 5 answered";
        $("quiz-progress").setAttribute("aria-valuenow",String(count));
        $("quiz-progress-fill").style.width = (count / 5 * 100) + "%";
      }
      function clearQuizFeedback() {
        $("quiz-score").textContent = "";
        $("quiz-reward").hidden = true;
        questions.forEach((_,index) => $("feedback-" + index).hidden = true);
        $("quiz-form").querySelectorAll("fieldset").forEach(fieldset => delete fieldset.dataset.result);
      }
      $("quiz-form").onchange = () => { clearQuizFeedback(); updateProgress($("quiz-form").querySelectorAll("input:checked").length); };
      $("quiz-form").onreset = () => { clearQuizFeedback(); updateProgress(0); };
    }
    async function readLimited(response) {
      if (!response.body) return "";
      const reader = response.body.getReader(), chunks = []; let size = 0;
      try {
        while (true) {
          const {done,value} = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > MAX_BYTES) { await reader.cancel(); throw new Error("Response exceeds the 1 MB limit. Choose a smaller endpoint or a supported pagination/filter value."); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      return new Blob(chunks).text();
    }
function valueType(value) {
  return value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
}
function fieldHint(name, types) {
  const hints = {
    id:"An identifier in this response. Preserve its exact value and type when linking records.",
    title:"A short label suitable for a heading or list item.",
    name:"A display name. Do not assume it is unique.",
    body:"Longer content that can populate a detail view. Render untrusted text safely.",
    description:"Descriptive content for a detail view or preview.",
    email:"An email-like field. Treat contact information as potentially personal data.",
    price:"A price-like value. Confirm the currency and units before formatting or calculations.",
    completed:"A completion indicator that can drive a task's checked/unchecked state.",
    latitude:"A geographic-coordinate field; verify coordinate conventions before plotting it.",
    longitude:"A geographic-coordinate field; verify coordinate conventions before plotting it.",
    message:"A message returned by the server; useful for understanding this particular outcome.",
    total:"A total-like value. Do not assume it equals the number of records in this response.",
    next:"A possible next-page reference. Its meaning and format require verification."
  };
  const key = name.toLowerCase();
  if (Object.hasOwn(hints,key)) return hints[key];
  if (key.endsWith("id")) return "An identifier-like name; it may connect this record to another resource. That relationship is an interpretation, not a verified contract.";
  if (types.includes("array")) return "A collection. Check for empty arrays before accessing individual elements.";
  if (types.includes("object")) return "Nested data. Read its child fields rather than treating it as plain text.";
  if (types.includes("boolean")) return "A true/false value that can drive conditional UI behavior.";
  return "An output field observed in the sample. Handle missing or null values rather than assuming it always exists.";
}
function inspectResponse() {
  const raw = current.raw, parsed = new URL(current.url), queries = [...parsed.searchParams];
  let records = Array.isArray(raw) ? raw : null, recordPath = "$";
  if (!records && object(raw)) {
    const collection = Object.entries(raw).find(([,value]) => Array.isArray(value));
    if (collection) { records = collection[1]; recordPath = "$[" + JSON.stringify(collection[0]) + "]"; }
  }
  const samples = records ? records.slice(0,10) : [raw], fields = new Map();
  function visit(value, path, depth) {
    if (!object(value)) return;
    for (const [name,item] of Object.entries(value).slice(0,30)) {
      if (fields.size >= 40) break;
      const location = path + "[" + JSON.stringify(name) + "]";
      if (!fields.has(location)) fields.set(location,{name,path:location,types:new Set(),example:item});
      fields.get(location).types.add(valueType(item));
      if (depth < 2 && object(item)) visit(item,location,depth + 1);
    }
  }
  if (records && object(raw)) visit(raw,"$",0);
  samples.forEach(sample => visit(sample,records ? recordPath + "[]" : "$",0));
  const keys = new Set([...fields.values()].map(field => field.name.toLowerCase()));
  let topic = "general data", useCases = [
    "Build a read-only data viewer: show the returned values, with separate loading, empty, and error states.",
    "Retrieve this response in a script and transform only the fields your workflow needs.",
    "Use this sample to prototype an integration, then test changing values and missing fields before relying on it."
  ];
  if (keys.has("title") && keys.has("completed")) {
    topic = "task or checklist data";
    useCases = ["Build a task list using title as the label and completed as its checked state.",
      "Separate finished and unfinished tasks in your own UI using the returned completion values.",
      "Prototype a read-only checklist dashboard. This GET request does not demonstrate how to save edits."];
  } else if (keys.has("title") && keys.has("body")) {
    topic = "post or article-like data";
    useCases = ["Create an article preview using title and a shortened body, with a detail view for the full text.",
      "Build a read-only content feed or a single-post page, depending on whether the response is a collection or one record.",
      "If a userId is present, preserve it for linking content to authors later; this response does not itself establish an author endpoint."];
  } else if (keys.has("price") && (keys.has("name") || keys.has("title"))) {
    topic = "catalog or product-like data";
    useCases = ["Populate catalog cards with the returned name/title and price values.",
      "Prototype a product comparison view; confirm currency and units before comparing prices.",
      "Use the returned identifiers to track a selected item locally. Availability and checkout are not established by this response."];
  } else if (keys.has("latitude") && keys.has("longitude") && [...keys].some(key => /temperature|weather|hourly|current/.test(key))) {
    topic = "location-based weather-like data";
    useCases = ["Build a location summary using the returned coordinates and weather fields.",
      "Display a current-condition widget when current values are present; use any returned units alongside the numbers.",
      "Plot an hourly series when matching time and value arrays are returned. Do not treat array positions as timestamps without checking them."];
  } else if (keys.has("email") && keys.has("name")) {
    topic = "profile or contact-like data";
    useCases = ["Build a profile summary using the returned name and contact fields.",
      "Prototype a contact directory with search performed on the data already loaded.",
      "Minimize which personal fields you display or store; a public response is not permission to republish personal data."];
  }
  const definition = object(raw) && (typeof raw.openapi === "string" || typeof raw.swagger === "string");
  if (definition) {
    topic = "an API definition document";
    useCases = ["Inspect the definition's top-level metadata as JSON.",
      "Find a concrete application-data endpoint in the definition if you want to explore returned business data.",
      "This simplified reader inspects the fetched JSON; it does not expand the document into an endpoint catalog."];
  }
  if (!current.ok) {
    topic = "an HTTP error response";
    useCases = ["Use this error payload to identify what the server rejected before building a data view.",
      "Keep a separate error state in your integration instead of treating this payload as a successful resource.",
      "Compare the status, URL, and returned message while troubleshooting. Do not repeatedly retry a request that needs correction."];
  }
  const insights = {
    "task or checklist data":"The title identifies a task while completed describes its completion state. Together, these fields can drive a read-only checklist entry rather than just displaying raw JSON.",
    "post or article-like data":"The title and body are the useful content: a heading and its main text. Identifiers such as id and userId, when present, help your application keep track of the post and a possible associated user.",
    "catalog or product-like data":"The item names or titles and price-like values can populate a catalog. Pair prices with verified currency and units, and treat stock or checkout support as separate capabilities.",
    "location-based weather-like data":"The coordinates identify a location and the weather-like fields contain measurements or series. Pair values with returned units and timestamps when available instead of guessing those conventions.",
    "profile or contact-like data":"The returned name and contact fields can populate a profile summary. Select only the personal fields the feature actually needs rather than exposing the entire record.",
    "an HTTP error response":"This payload describes a problem rather than the resource you expected. Read the status and any returned message first, then correct the request or access problem before building a data view.",
    "an API definition document":"The URL is serving a machine-readable API description, not an ordinary resource result. To explore application data, choose a concrete endpoint from that API instead."
  };
  const insight = current.empty ? "There is no payload to map into a UI. Handle the status and headers, and show an appropriate empty state rather than attempting to access JSON fields." :
    insights[topic] || "Use the returned value or field guide to decide what your screen or script can actually consume. Keep that read-only integration separate from any untested write operations.";
  return {parsed,queries,records,recordPath,fields:[...fields.values()],topic,useCases,definition,insight};
}
function responseShape(raw) {
  if (current.empty) return "an empty response body";
  if (Array.isArray(raw)) return "an array containing " + raw.length + " item(s)";
  if (object(raw)) return "an object with " + Object.keys(raw).length + " top-level field(s)";
  return raw === null ? "a null value" : "a " + valueType(raw) + " value";
}
function descriptionText(value) {
  if (typeof value !== "string") return "";
  const text = value.replace(/<\/p\s*>/gi,"\n\n").replace(/<[^>]*>/g," ")
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/\*\*([^*]+)\*\*/g,"$1")
    .replace(/`([^`]+)`/g,"$1").replace(/^#{1,6}\s+/gm,"").trim()
    .split(/\n\s*\n/)[0].replace(/\s+/g," ");
  if (text.length <= 480) return text;
  const end = text.lastIndexOf(" ",480);
  return text.slice(0,end > 300 ? end : 480) + "...";
}
function apiOverview(model) {
  if (!current.ok || current.empty) return `<p>${esc(model.insight)}</p>`;
  if (model.definition) {
    const info = object(current.raw.info) ? current.raw.info : {};
    const name = typeof info.title === "string" && info.title.trim() ? info.title.trim() : model.parsed.hostname + " API";
    const description = descriptionText(info.description);
    const introduction = description.length > 240 ? description.match(/^.*?[.!?](?=\s|$)/)?.[0] || description : description;
    const tags = Array.isArray(current.raw.tags) ? current.raw.tags.filter(object).map(tag => descriptionText(tag.description) || (typeof tag.name === "string" ? tag.name : "")).filter(Boolean).slice(0,3) : [];
    return `<p><b>${esc(name)}</b></p>` +
      (introduction ? `<p>${esc(introduction)}</p>` : "") +
      (tags.length ? `<p>It covers:</p>${list(tags)}` : "") +
      (!description && !tags.length ? "<p>The definition names this API but does not explain its purpose.</p>" : "");
  }
  const summaries = {
    "task or checklist data":"This looks like a task or checklist API, with task titles and completion states.",
    "post or article-like data":"This looks like a posts API, returning content such as titles, body text, and identifiers.",
    "catalog or product-like data":"This looks like a product catalog API, returning item names or titles and price-like values.",
    "location-based weather-like data":"This looks like a weather API, returning location-based measurements or forecasts.",
    "profile or contact-like data":"This looks like a profile or contacts API, returning names and contact details."
  };
  const summary = summaries[model.topic];
  if (summary) return `<p>${esc(summary)}</p><p>${esc(model.insight)}</p>`;
  return "<p>This endpoint can be read by another application, but its purpose is not clear from the response alone.</p>";
}
function card(id, number, title, body, extra = "") {
  return `<article class="card ${extra}" id="${id}"><h3><span class="number">${number}</span> ${title}</h3>${body}</article>`;
}
function parameterHint(name) {
  if (/^(page|offset|cursor|limit|per_page)$/i.test(name)) return "Pagination-like name. The supplied value is visible here; its supported range and server behavior are not tested.";
  if (/^(q|query|search)$/i.test(name)) return "Search-like name. Verify matching rules before promising exact or partial search in your UI.";
  if (/^(latitude|longitude)$/i.test(name)) return "Coordinate-like input. Verify the accepted range, location, and coordinate system.";
  return "A value supplied in the query string. Its name alone does not establish its meaning or whether it is required.";
}
function makeCodes(url) {
  const parse = current.format === "json" ? "text ? JSON.parse(text) : null" : "text";
  codes = {
    JavaScript:`const response = await fetch(${JSON.stringify(url)}, {\n  method: "GET",\n  credentials: "omit",\n  referrerPolicy: "no-referrer"\n});\nconst text = await response.text();\nif (!response.ok) {\n  throw new Error(\`HTTP \${response.status}: \${text.slice(0, 200)}\`);\n}\nconst data = ${parse};\nconsole.log(data);`,
    Python:`import requests\n\nresponse = requests.get(\n    ${JSON.stringify(url)},\n    timeout=15,\n)\nresponse.raise_for_status()\ndata = ${current.format === "json" ? "response.json()" : "response.text"}\nprint(data)`,
    cURL:"curl --fail-with-body --max-time 15 \\\n  --request GET \\\n  --url '" + url.replace(/'/g,"'\\''") + "'"
  };
}
function quizQuestion(category, prompt, answer, wrong, explanation) {
  const options = [{text:answer,correct:true},...wrong.map(text => ({text,correct:false}))];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i],options[j]] = [options[j],options[i]];
  }
  return {category,prompt,options,explanation};
}
function buildQuiz(model) {
  const pair = model.queries[0], field = model.fields[0];
  const input = pair ? quizQuestion("Parameters",`Where does ${pair[0]}=${pair[1]} appear in this request?`,
    "In the URL query string.",
    ["In a JSON request body.","Only in the response headers.","As an automatically added authentication header."],
    "Query parameters follow ? in the URL. This GET does not send a request body. Their accepted values are not learned from one result.") :
    quizQuestion("Parameters",field ? `What does the displayed ${field.path} field represent?` : "Which request did this reader send?",
      field ? "An observed response field, not a proven required input." : "A GET request without a request body.",
      field ? ["A mandatory query parameter.","A private API key.","Proof that every future response has this field."] : ["A POST request with a JSON body.","A DELETE request.","A request that automatically supplies a private key."],
      field ? "Output fields describe what came back. They do not define what must be sent." : "The one-field reader performs an unauthenticated GET to the entered URL.");
  const error = current.status === 404 ? quizQuestion("Errors","This request returned HTTP 404. What is the useful next step?",
    "Check the path and resource identifier before expecting application data.",
    ["Treat the error body as a successful resource.","Retry indefinitely without changing anything.","Assume all other endpoints are unavailable."],
    "404 generally means the requested resource was not found. The returned payload may give more context.") :
    quizQuestion("Errors","If this endpoint later returns HTTP 429, what should your integration do?",
      "Slow down and respect Retry-After when supplied.",
      ["Immediately send the same request hundreds of times.","Treat the error payload as successful data.","Assume 429 means a malformed JSON response."],
      "429 generally indicates too many requests. Use bounded retries and backoff rather than assuming a numeric quota.");
  const shape = responseShape(current.raw);
  return [input,error,
    quizQuestion("Use cases","Which next step fits the response and the analysis above?",model.useCases[0],
      ["Assume this GET can also save edits.","Promise unlimited requests based on this single response.","Assume the sample proves an uptime guarantee."],
      "This is a contextual recommendation based on returned data, not a promise of additional provider capabilities."),
    quizQuestion("Authentication","Which statement accurately describes this reader's request?",
      "It sent no authentication header or browser credentials; broader access policies still need verification.",
      ["It automatically supplied the provider's private key.","The result proves every API endpoint is public.","It proved authentication will never be needed."],
      "The reader deliberately omits browser credentials. A single status does not establish an API-wide authentication policy."),
    quizQuestion("Responses","What came back in this particular response?",shape,
      ["A guarantee that future values will be identical.","The complete list of every supported endpoint.","A verified schema for every response."],
      "The returned body is " + shape + ". Validate shape and missing values each time instead of treating a sample as a contract.")];
}
function renderVisualizer(model) {
  const stages = [
    {id:"request",title:"Request",label:"Observed request",text:`Your browser sends GET ${model.parsed.pathname}${model.parsed.search}. ${model.queries.length ? model.queries.length + " query entry/entries travel in the URL." : "No query parameters are present."} No body is sent.`,failure:"A mistyped path or invalid parameter can cause a different result or a client error."},
    {id:"authentication",title:"Access check",label:"Request facts + interpretation",text:"No Authorization header or browser credentials were sent. The server may apply access checks, but this response cannot reveal their internal ordering or the policies of other endpoints.",failure:"If you receive 401 or 403, do not embed a private key in this website; use an authorized integration."},
    {id:"server",title:"Server processing",label:"Conceptual / not traced",text:`The response came from ${new URL(current.responseUrl || current.url).hostname}. It may validate inputs or compute data; those internal steps are not visible from this GET.`,failure:"A server problem may produce a 5xx response. Retrying should be bounded and appropriate to the operation."},
    {id:"database",title:"Storage, if any",label:"Optional / not observed",text:"The response could come from a database, a cache, a file, or a computation. Nothing in this visualization proves a database exists. This stage explains a possible dependency, not an actual trace.",failure:"If a backend dependency fails, the server may return an error. This response does not identify a particular dependency."},
    {id:"response",title:"Response",label:current.demo ? "Offline sample" : "Observed result",text:`HTTP ${current.status} returned ${responseShape(current.raw)}. Read the status before using the payload, then handle empty values and unexpected shapes.`,failure:"A response can be an error payload, malformed JSON, or a valid but unexpected shape."}
  ];
  $("visualizer-container").innerHTML = card("api-visualizer","10","Follow the request",
    '<p>A conceptual journey, not a trace of the provider\'s internals. Click a stage for its explanation and a possible failure point.</p><div class="flow-stages" role="group" aria-label="API flow stages">' +
    stages.map(stage => `<button type="button" class="flow-stage ${stage.id === "database" ? "optional" : ""}" data-flow-stage="${stage.id}" aria-pressed="false" aria-controls="flow-detail"><b>${esc(stage.title)}</b><small>${esc(stage.label)}</small></button>`).join("") +
    '</div><div class="flow-detail" id="flow-detail" role="region" aria-label="Selected flow stage" aria-live="polite"></div>');
  function selectStage(id) {
    const stage = stages.find(item => item.id === id);
    document.querySelectorAll("[data-flow-stage]").forEach(button => button.setAttribute("aria-pressed",String(button.dataset.flowStage === id)));
    $("flow-detail").innerHTML = `<h4>${esc(stage.title)}</h4><span class="badge inference">${esc(stage.label)}</span><p>${esc(stage.text)}</p><h4>Possible failure point</h4><p>${esc(stage.failure)}</p>`;
  }
  document.querySelectorAll("[data-flow-stage]").forEach(button => button.onclick = () => selectStage(button.dataset.flowStage));
  selectStage("request");
}
function render() {
  const model = inspectResponse(), rawText = current.format === "json" ? pretty(current.raw) : String(current.raw);
  const preview = rawText.slice(0,30000), fields = model.fields;
  const source = current.demo ? "Offline sample / illustrative data" : "One browser GET / observed response";
  $("source-badge").textContent = source;
  const suppliedName = model.definition && current.ok && object(current.raw.info) && typeof current.raw.info.title === "string" ? current.raw.info.title.trim() : "";
  $("api-title").textContent = suppliedName || model.parsed.hostname + " / " + model.topic;
  $("result-metrics").textContent = `HTTP ${current.status} | ${current.contentType} | ${current.bytes.toLocaleString()} UTF-8 bytes` +
    (current.demo ? " | Not a live request" : ` | ${Math.round(current.elapsed)} ms observed`);
  const overview = apiOverview(model);
  const use = model.records ? "Use it when your UI or script needs this kind of collection and can handle an empty list, changing records, and possible pagination." :
    "Use it when you need this individual result and can handle a missing resource or a changed response shape.";
  const unsuitable = [
    "Do not use this GET as a save, update, checkout, or delete operation; none of those behaviors has been demonstrated.",
    model.records ? "Do not assume this collection contains every record. A page, limit, cursor, or account policy may affect what comes back." : "Do not treat one returned object or value as a complete description of everything this API can do.",
    "Do not promise an uptime guarantee, unrestricted reuse, or unlimited throughput based on one response. Confirm those requirements before production use."
  ];
  if (!current.ok) unsuitable.unshift("This request is currently an error result. Fix the URL or access problem before using its payload as application data.");
  if (model.definition) unsuitable.unshift("This URL serves a definition document, not business data. Choose a concrete resource URL to explore application results.");
  const queryTable = model.queries.length ? `<div class="table-wrap"><table><thead><tr><th>Query input</th><th>Supplied value</th><th>How to think about it</th></tr></thead><tbody>${model.queries.map(([name,value]) => `<tr><td>${esc(name)}</td><td>${esc(value || "(empty string)")}</td><td>${esc(parameterHint(name))}</td></tr>`).join("")}</tbody></table></div>` :
    "<p>No query parameters were supplied. This is not proof that the endpoint has no optional inputs.</p>";
  const fieldTable = fields.length ? `<div class="table-wrap"><table><caption class="small">Observed fields, not a guaranteed schema. Sampled up to ten collection items, 40 field paths, and two nested object levels.</caption><thead><tr><th>Field path</th><th>Observed type(s)</th><th>Practical explanation</th></tr></thead><tbody>${fields.map(field => `<tr><td><code>${esc(field.path)}</code></td><td>${esc([...field.types].join(" / "))}</td><td>${esc(fieldHint(field.name,[...field.types]))}<br><span class="small">Sample: ${esc(pretty(field.example).slice(0,120))}</span></td></tr>`).join("")}</tbody></table></div>` : `<p>The response is ${esc(responseShape(current.raw))}; there are no sampled object fields to list.</p>`;
  const request = `<div class="endpoint"><span class="method">GET</span>${esc(current.url)}</div>${current.responseUrl && current.responseUrl !== current.url ? `<p class="small">The request redirected to ${esc(current.responseUrl)}.</p>` : ""}<ol><li>Send this URL without a request body. Query values, when present, are part of the URL.</li><li>Check HTTP ${current.status} before treating the result as usable data.</li><li>Read the ${esc(current.format === "json" ? "JSON value" : "text")} and map only the fields your application needs.</li></ol><h4>Inputs in this URL</h4>${queryTable}<h4>Access and authentication</h4><p>This reader sent no authentication header or browser credentials. ${current.ok ? "This request produced a successful status, but that does not establish the access policy of the whole API." : "The unsuccessful status is shown above; check the returned error and whether this resource is publicly accessible."}</p><h4>Understand the returned fields</h4>${fieldTable}`;
  const commonErrors = [["400 / 422","Check parameter names, values, and formatting before retrying."],["401 / 403","Check whether this resource requires authorized access. Never expose a private key in frontend code."],["404","Verify the path and resource identifier; the requested resource may not exist."],["429","Slow down and respect Retry-After when exposed. Do not retry in a tight loop."],["5xx","The server or a dependency may be failing. Use bounded backoff for safe retries."]];
  const errorBody = `<p><b>This result:</b> HTTP ${current.status}. ${current.ok ? "The request succeeded at the HTTP level; still check the body before using it." : "The response body below is an error result, not a successful resource."}</p><h4>General HTTP troubleshooting</h4><p class="small">These are standard HTTP meanings and integration recommendations, not a provider-specific error catalog.</p>${list(commonErrors.map(([code,action]) => code + ": " + action))}<p>If the browser reports a network/CORS failure, JavaScript may not have received an accessible HTTP response at all. Check browser access rules, HTTPS, and connectivity rather than assuming a particular status code.</p>`;
  const quotaHeaders = Object.entries(current.headers).filter(([name]) => /ratelimit|retry-after/i.test(name));
  const limits = `<p>${current.demo ? "This offline sample has no measured network timing." : `This browser observed ${Math.round(current.elapsed)} ms for this request, including reading the body. It is a single observation, not a latency guarantee.`} The decoded text is ${current.bytes.toLocaleString()} UTF-8 bytes; this is not the compressed transfer size.</p>` +
    (quotaHeaders.length ? `<h4>Headers visible to this browser</h4>${list(quotaHeaders.map(([name,value]) => name + ": " + value))}<p>These are the exposed header values for this response. Verify their units and time windows before using them as quota rules.</p>` :
    "<p>No rate-limit or Retry-After headers were exposed to this browser. That does not imply unlimited requests. Avoid aggressive polling and handle throttling explicitly.</p>") +
    "<p>Use a smaller page or filter when the endpoint supports it, load only what the screen needs, and avoid re-requesting unchanged data unnecessarily. Verify caching policies before caching sensitive results.</p><p class=\"small\">Reader safeguards: one GET, a 15-second timeout, and a 1 MB response limit. These are this website's safeguards, not the provider's published limits.</p>";
  makeCodes(current.url);
  $("result-content").innerHTML = `<div class="grid"><div>${card("overview-card","01","What is this API?",overview)}${card("use-cases-card","02","What can you build with it?",'<span class="badge inference">Contextual ideas based on this response</span>' + list(model.useCases))}${card("when-to-use","03","When should you use it?",`<p>${esc(use)}</p><p>Match the displayed fields and inputs to your feature before integrating. ${current.ok ? "Start with a read-only prototype and test empty or missing values." : "Resolve the current HTTP error first."}</p>`)}${card("when-not-to-use","04","When should you NOT use it?",list(unsuitable))}${card("how-it-works","05","How does it work?",request)}</div><div>
    ${card("code-examples","06","Try it in your code",`<div class="code-tabs">${["JavaScript","Python","cURL"].map(language => `<button type="button" data-language="${language}" class="${activeCode === language ? "active" : ""}" aria-pressed="${activeCode === language}">${language}</button>`).join("")}<button type="button" class="copy" id="copy-code">Copy</button></div><div class="file-meta"><span id="code-filename"></span><span>GET template &middot; not executed</span></div><pre><code id="code-output"></code></pre><p class="small">${current.demo ? "Offline samples use illustrative example.com URLs. Replace the URL with a real endpoint before running this code. " : ""}JavaScript runs in a browser. Python needs requests installed. cURL uses POSIX shell quoting. Check data shape before displaying values.</p>`,"code-card")}
    ${card("documented-errors","07","Errors to watch out for",errorBody,"warning")}
    ${card("performance-limits","08","Performance and practical limits",limits)}
    ${card("response-preview","09","The response you received",`<p>${esc(current.parseWarning || "Inspect this sample alongside the field guide. A response example is not a guaranteed schema.")}</p><pre class="source-text">${esc(preview)}</pre>${rawText.length > preview.length ? "<p class=\"small\">Preview shortened to the first 30,000 characters.</p>" : ""}`)}
    </div></div><div id="visualizer-container"></div><div id="quiz-container"></div>`;
  function selectLanguage(language) {
    activeCode = language;
    document.querySelectorAll("[data-language]").forEach(button => {
      button.classList.toggle("active",button.dataset.language === language);
      button.setAttribute("aria-pressed",String(button.dataset.language === language));
    });
    $("code-output").textContent = codes[language];
    $("code-filename").textContent = {JavaScript:"request.js",Python:"request.py",cURL:"request.sh"}[language];
    $("copy-code").textContent = "Copy";
  }
  document.querySelectorAll("[data-language]").forEach(button => button.onclick = () => selectLanguage(button.dataset.language));
  selectLanguage(activeCode);
  $("copy-code").onclick = () => copyText(codes[activeCode],$("copy-code"));
  renderVisualizer(model);
  renderQuiz(buildQuiz(model));
  $("results").hidden = false;
  $("empty-note").hidden = true;
  document.querySelectorAll(".workspace-tabs [data-jump]").forEach(button => button.disabled = false);
  updateNavigation("overview-card");
}
function clearResults() {
  current = null;
  $("results").hidden = true;
  $("result-content").replaceChildren();
  $("empty-note").hidden = false;
  document.querySelectorAll(".workspace-tabs [data-jump]").forEach(button => button.disabled = button.dataset.jump !== "workspace-input");
  updateNavigation("workspace-input");
}
function validUrl(value) {
  const url = new URL(value);
  if (!["http:","https:"].includes(url.protocol)) throw new Error("Use a complete http:// or https:// API URL.");
  if (url.username || url.password) throw new Error("Do not include credentials in a URL. Use a public endpoint without secrets.");
  if (url.hash) throw new Error("Remove the #fragment: URL fragments are not sent to an API.");
  return url.href;
}
$("url-panel").onsubmit = async event => {
  event.preventDefault(); cancelRequest(); resetFeedback(); clearResults();
  const version = requestVersion, started = performance.now();
  let timer;
  try {
    const url = validUrl($("api-url").value.trim()), requestController = new AbortController();
    controller = requestController;
    timer = setTimeout(() => requestController.abort(),15000);
    $("url-panel").querySelector("button[type=submit]").disabled = true;
    $("status").textContent = "Reading this URL and building your explanation...";
    document.body.classList.add("is-loading");
    const response = await fetch(url,{method:"GET",credentials:"omit",referrerPolicy:"no-referrer",signal:requestController.signal,headers:{Accept:"application/json, text/plain;q=0.9"}});
    const text = await readLimited(response);
    if (version !== requestVersion) return;
    const contentType = response.headers.get("content-type") || "unspecified content type";
    if (/text\/html/i.test(contentType) || /^\s*(<!doctype html|<html)[\s>]/i.test(text)) throw new Error("This URL returned a web page. Paste a direct API endpoint that returns JSON or plain text.");
    let raw = text, format = "text", parseWarning = "";
    if (text.trim()) {
      try { raw = JSON.parse(text); format = "json"; }
      catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        if (/json/i.test(contentType)) parseWarning = "The server labeled this as JSON, but it could not be parsed. The response is shown as text; handle this mismatch in your integration.";
      }
    } else parseWarning = "This response has an empty body. Do not attempt to parse it as a populated JSON object.";
    const headers = {};
    for (const name of ["content-type","cache-control","etag","last-modified","retry-after","ratelimit-limit","ratelimit-remaining","ratelimit-reset","x-ratelimit-limit","x-ratelimit-remaining","x-ratelimit-reset"]) {
      const value = response.headers.get(name);
      if (value !== null) headers[name] = value;
    }
    if (format === "text" && /^(image|audio|video)\/|application\/(pdf|zip|octet-stream)/i.test(contentType)) throw new Error("This URL returned binary media rather than JSON or plain text. Choose a data endpoint.");
    current = {url,responseUrl:response.url || url,status:response.status,ok:response.ok,contentType,raw,format,empty:!text,parseWarning,headers,bytes:new TextEncoder().encode(text).length,elapsed:performance.now() - started,demo:false};
    render();
    $("status").textContent = "Explanation ready. Observations and contextual interpretations are separated.";
    if (!response.ok) showError("HTTP " + response.status + ": the explanation describes this error response, not successful application data.");
  } catch (error) {
    if (version !== requestVersion) return;
    clearResults();
    $("status").textContent = "";
    showError(error.name === "AbortError" ? "The request timed out after 15 seconds. Try again or choose a smaller endpoint." :
      error instanceof TypeError ? "Could not read this URL. Check that it is complete, publicly accessible, and allows browser requests (CORS). HTTPS pages may block HTTP APIs. Details: " + error.message : error.message);
  } finally {
    clearTimeout(timer);
    if (version === requestVersion) {
      controller = null;
      document.body.classList.remove("is-loading");
      $("url-panel").querySelector("button[type=submit]").disabled = false;
    }
  }
};
function demo(store) {
  cancelRequest(); resetFeedback(); clearResults();
  const raw = store ? {products:[{id:101,name:"Desk light",price:29.5,inStock:true},{id:102,name:"Notebook",price:8,inStock:false}],total:2} :
    {userId:1,id:1,title:"A sample post",body:"This is illustrative content for exploring a read-only API response."};
  const url = store ? "https://example.com/products?limit=2" : "https://example.com/posts/1";
  $("api-url").value = url;
  current = {url,status:200,ok:true,contentType:"application/json",raw,format:"json",headers:{},bytes:new TextEncoder().encode(pretty(raw)).length,elapsed:0,demo:true};
  render();
  $("status").textContent = "Offline sample loaded. Its URL and data are illustrative; no network request was made.";
}
$("demo-posts").onclick = () => demo(false);
$("demo-shop").onclick = () => demo(true);
$("hero-demo").onclick = () => demo(true);
$("copy-endpoint").onclick = () => {
  if (!current) { showError("Analyze a URL before copying its endpoint."); return; }
  copyText(current.url,$("copy-endpoint"));
};
initializeTheme();
