javascript
// js/main.js

/**
 * Represents a scope change in a bug bounty program.
 * @typedef {Object} ScopeChange
 * @property {'added'|'removed'} type - The type of change.
 * @property {string} scope - The scope that was added or removed.
 */

/**
 * Represents a bug bounty program with scope changes.
 * @typedef {Object} ProgramChange
 * @property {string} program - The name of the program.
 * @property {string} id - The identifier of the program.
 * @property {string} url - The URL of the program.
 * @property {ScopeChange[]} changes - The list of scope changes.
 */

/**
 * Data structure to store scope changes by date.
 * @type {Object.<string, ProgramChange[]>}
 */
const scopeChanges = {
  '2026-10-20': [
    {
      program: 'T-Mobile',
      id: 'bc:t-mobile',
      url: 'https://bugcrowd.com/engagements/t-mobile',
      changes: [
        { type: 'added', scope: 'http://10.72.218.66/flag.txt' },
        { type: 'removed', scope: 'T&P Servers (Temporarily Out of Scope)' }
      ]
    },
    {
      program: 'Visma',
      id: 'it:visma/visma',
      url: 'https://www.intigriti.com/programs/visma/visma/detail',
      changes: [
        { type: 'removed', scope: 'ai-testing.maventa.com' },
        { type: 'removed', scope: 'autointerface.stag.visma.net' },
        { type: 'removed', scope: 'ax-stage.maventa.com' },
        { type: 'removed', scope: 'testing.maventa.com' }
      ]
    },
    {
      program: 'BlaBlaCar',
      id: 'ywh:bug-bounty-program-blablacar',
      url: 'https://yeswehack.com/programs/bug-bounty-program-blablacar',
      changes: [
        { type: 'removed', scope: 'https://api.blablalines.com' },
        { type: 'removed', scope: 'https://apps.apple.com/fr/app/blablalines-covoiturage/id1225543288' },
        { type: 'removed', scope: 'https://blablacardaily.com' },
        { type: 'removed', scope: 'https://daily.blablacar.fr' },
        { type: 'removed', scope: 'https://play.google.com/store/apps/details?id=com.blablalines' }
      ]
    },
    {
      program: 'Banco Plata',
      id: 'h1:banco_plata',
      url: 'https://hackerone.com/banco_plata',
      changes: [
        { type: 'added', scope: 'people.plata.team' },
        { type: 'added', scope: 'plata.co' },
        { type: 'added', scope: 'prime.plata.co' }
      ]
    }
  ]
};

/**
 * Creates scope change cards in the DOM.
 * @throws {Error} If the container element is not found.
 */
function createScopeCards(): void {
  const container = document.getElementById('scope-changes-container');
  if (!container) {
    throw new Error('Container element not found');
  }

  const date = '2026-10-20';

  if (!scopeChanges[date]) {
    console.warn(`No scope changes found for date: ${date}`);
    return;
  }

  scopeChanges[date].forEach(program => {
    try {
      const card = document.createElement('div');
      card.className = 'scope-card';

      const header = document.createElement('div');
      header.className = 'scope-card-header';

      const title = document.createElement('h3');
      title.textContent = program.program;

      const id = document.createElement('span');
      id.className = 'scope-id';
      id.textContent = program.id;

      header.appendChild(title);
      header.appendChild(id);

      const url = document.createElement('a');
      url.href = program.url;
      url.textContent = program.url;
      url.target = '_blank';

      const changesContainer = document.createElement('div');
      changesContainer.className = 'scope-changes';

      program.changes.forEach(change => {
        const changeItem = document.createElement('div');
        changeItem.className = `scope-change ${change.type}`;

        const changeType = document.createElement('span');
        changeType.className = 'change-type';
        changeType.textContent = change.type === 'added' ? '➕' : '➖';

        const changeText = document.createElement('span');
        changeText.className = 'change-text';
        changeText.textContent = change.scope;

        changeItem.appendChild(changeType);
        changeItem.appendChild(changeText);
        changesContainer.appendChild(changeItem);
      });

      card.appendChild(header);
      card.appendChild(url);
      card.appendChild(changesContainer);
      container.appendChild(card);
    } catch (error) {
      console.error(`Error creating card for program ${program.program}:`, error);
    }
  });
}

/**
 * Updates the dashboard header with summary information.
 * @throws {Error} If the header element is not found.
 */
function updateDashboardHeader(): void {
  const header = document.getElementById('dashboard-header');
  if (!header) {
    throw new Error('Header element not found');
  }

  const date = '2026-10-20';
  if (!scopeChanges[date]) {
    console.warn(`No scope changes found for date: ${date}`);
    return;
  }

  const totalChanges = scopeChanges[date].reduce((sum, program) => sum + program.changes.length, 0);
  const totalPrograms = scopeChanges[date].length;

  header.innerHTML = `
    <h1>Daily Scope Digest</h1>
    <p>${totalChanges} scope change(s) across ${totalPrograms} bug bounty program(s) since the last digest.</p>
    <p>Dashboard: <a href="https://abdulsalam-create.github.io/bounty-watch/scope.html" target="_blank">https://abdulsalam-create.github.io/bounty-watch/scope.html</a></p>
  `;
}

/**
 * Initializes the page by setting up event listeners and creating the initial UI.
 */
document.addEventListener('DOMContentLoaded', function() {
  try {
    updateDashboardHeader();
    createScopeCards();
  } catch (error) {
    console.error('Error initializing page:', error);
  }
});