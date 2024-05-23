import { h, render, Component } from '../importmap/preact/src/index.js';
import htm from '../importmap/htm/src/index.mjs';
import { requireStylesheet } from '../modules/requireStylesheet.mjs';

import Entity from './Entity.mjs';
import Actions from './Actions.mjs';
import Match from './Match.mjs';
import Pick from './Pick.mjs';
import Peek from './Peek.mjs';
import Edit from './Edit.mjs';

const html = htm.bind(h);

class Main extends Component {
  componentDidMount() {
    requireStylesheet(browser.runtime.getURL('/components/main.css'));
  }

  render({
    entity,
    selectable,
    suggestions,
    workbench,
    otherEntities,
    manager,
    viewId,
  }) {
    const actionGroups = [];

    if (otherEntities) {
      const otherEntityIds = otherEntities.map(otherEntity => {
        return { id: otherEntity.id };
      });
      if (otherEntityIds.length > 0) {
        actionGroups.push({
          title: browser.i18n.getMessage('other_matches_title'),
          items: otherEntityIds,
        });
      }
    }

    return html`
      <div class="main">
        ${suggestions?.length > 0
          ? html`<${Match}
              suggestions=${suggestions}
              manager=${manager}
              viewId=${viewId} />`
          : null}
        ${(entity || selectable) &&
        html`<main class="main__content">
          ${entity && html`<${Entity} ...${entity} manager=${manager} />`}
          ${selectable &&
          html`<${Pick} options=${selectable} manager=${manager} />`}
        </main>`}
        ${actionGroups.length > 0
          ? html`<${Actions} groups=${actionGroups} manager=${manager} />`
          : null}
        ${workbench
          ? html`<${Peek}
              edits=${workbench.edits}
              title=${workbench.title}
              view=${workbench.view}
              subjectId=${workbench.subjectId}
              manager=${manager} />`
          : null}
      </div>
    `;
  }
}

export default Main;
