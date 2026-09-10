// Renders the roster cards and the releases table from the inline catalogue
// (the JSON block with id="catalog" in index.html).
(function () {
  var block = document.getElementById('catalog');
  var cards = document.getElementById('cards');
  var tbody = document.querySelector('#releases-table tbody');
  var status = document.getElementById('status');
  if (!block || !cards || !tbody) return;
  var artists;
  try {
    artists = JSON.parse(block.textContent).artists || [];
  } catch (e) {
    return;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  artists.forEach(function (a, i) {
    var li = el('li', 'card');
    li.style.setProperty('--accent', a.accent || '#8ef');
    var link = el('a', 'card-link');
    link.href = a.url;
    var img = el('img');
    img.src = a.cover;
    img.alt = a.name + ' cover';
    img.width = 640;
    img.height = 640;
    img.loading = i < 2 ? 'eager' : 'lazy';
    var body = el('div', 'card-body');
    body.appendChild(el('p', 'mono cat', a.cat));
    body.appendChild(el('h3', null, a.name));
    body.appendChild(el('p', 'genre', a.genre + ' · ' + a.game));
    body.appendChild(el('p', 'blurb', a.blurb));
    body.appendChild(el('span', 'mono go', 'open artist page ▸'));
    link.appendChild(img);
    link.appendChild(body);
    li.appendChild(link);
    cards.appendChild(li);

    var tr = document.createElement('tr');
    tr.appendChild(el('td', 'mono', a.cat));
    var artistCell = el('td');
    var artistLink = el('a', null, a.name);
    artistLink.href = a.url;
    artistCell.appendChild(artistLink);
    tr.appendChild(artistCell);
    tr.appendChild(el('td', null, a.release));
    tr.appendChild(el('td', null, a.game));
    tr.appendChild(el('td', 'mono', String(a.tracks)));
    tbody.appendChild(tr);
  });

  if (status) {
    var games = {};
    artists.forEach(function (a) {
      if (a.game && a.game !== 'In development') games[a.game] = true;
    });
    status.textContent =
      artists.length + ' artists · ' + Object.keys(games).length + ' games · 1 label';
  }
})();
