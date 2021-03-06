# Read meters GitHub action

This action executes meter functions within your repository and commits results of these into a
TOML file within the same repository.

The goals of this action are to increase developer awareness of the business objectives and to tie
real product KPIs with the evolution of its code.

## Inputs

### `commit-token`

**Required, no default value** The token that would allow the action to make a commit into the
repository. No default value, but you would usually use `${{ secrets.GITHUB_TOKEN }}` (always
available).

### `commit-branch`

**Required, but has default value** The name of the branch where readings should be committed to.
`main`, `develop`, `master`, etc. Default is `master`.

### `readings-env`

**Required, but has default value** The name of the environment that meters are tracking. `prod`,
`staging`, `uat`, etc. The value is used to generate commit subject line and a commit mark
(`[meter-readings:${readings-env}]`) in the commit body. The mark is used later for
environment-based filtering of readings. In a nutshell, this input is here to allow yourself
having different meter stacks for different environments. Default is `prod`.

### `readings-path`

**Required, but has default value** The relative (to repository root) path to the readings file.
Can use `${readings-env}` interpolation to specify environment. To avoid merge conflicts, it is
recommended for each environment/branch to have its own readings file. Default is
`kpis/latest.${readings-env}.json`.

### `meters-script`

**Required, but has default value** The relative (to repository root) path to the meters script.
The meters script is a NodeJS 12.x script that exports async functions - each represents a
different meter. Export name is a meter name and function promise result is the meter value. Keep
in mind that action does not run `npm install` for you, so you have to commit your `node_modules`
if your meters have dependencies. Default is `kpis/meters/index.js`.

## Outputs

### `readings`

All the current readings from all the meters, serialised as a JSON string.

## Example usage

Below is an example of a project with two meters (`revenue` and `pronicNumber`), read every 12
hours. Meters code is read from the `master` branch. Meter readings are then committed into the
`kpis/latest.prod.json` file under the `master` branch.

### `.github/workflows/read-meters-prod.yml`

```yaml
name: Read production meters (KPIs)

on:
  schedule:
    # run every 12 hours, reading most recent stats and committing
    # changes to your readings file.
    #
    # use https://crontab.guru to fine-tune this and remember
    # that GitHub's timezone is UTC.
    - cron: "0 */12 * * *"

  push:
    # also rerun on changes to this workflow file, in case some
    # parameters changed.
    paths: [".github/workflows/read-meters-prod.yml"]

jobs:
  read-meters:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          # Checkout the branch we want to run meters from. This can be a
          # different branch to the one we commit readings to.
          #
          # If not explicitly specified, workflow would always use the default
          # branch when triggered via schedule (cron).
          ref: master

      - name: Read meters
        uses: everzet/metronome/read-meters-action@master
        with:
          # ${{ secrets.GITHUB_TOKEN }} is always available within
          # GitHub workflows for the given repository. Unless you want to
          # separate your meters from the readings, below should just work.
          commit-token: ${{ secrets.GITHUB_TOKEN }}

          # The name of the branch that we should commit result readings to.
          commit-branch: master

          # The name of the tracked environment. Used in the commit subject and
          # default `readings-path`. Allows tracking meters from different
          # environments (staging, prod, etc.).
          readings-env: prod

        env:
          # most of your meters would fetch data from third party APIs
          # or services. You can provide authentication details for these via
          # GitHub secrets and environment variables here. Environment variables
          # would be accessible within your meters with `process.env.NAME_OF_VAR`
          BUSINESS_DASHBOARD_API_KEY: ${{ secrets.BUSINESS_DASHBOARD_API_KEY }}
```

### `kpis/meters/index.js`

```js
const axios = require("axios");

module.exports.revenue = async (env) => {
  const API_KEY = process.env.BUSINESS_DASHBOARD_API_KEY;
  const { data } = await axios.get(
    `https://dashboard.our-company.com?apiKey=${API_KEY}`
  );
  return data.revenue;
};

module.exports.pronicNumber = async (env) => {
  if (env === "prod") {
    return 42;
  } else {
    return 10;
  }
};
```

Note that the `revenue` meter uses `axios` library. You can install and use dependencies via `npm`
as per usual, but you would have to commit `kpis/meters/node_modules/` folder (don't forget to
remove it from `.gitignore`).

### `kpis/latest.prod.json`

The readings file would be created automatically by the workflow on first successful meters
reading and would be updated (with `kpis(prod): ...` commit) every time readings update. The file
itself is a simple one-dimensional JSON map:

```json
{
  "revenue": 500.0,
  "pronicNumber": 42
}
```

Keys are always sorted before being written down, so you should only see this file changed when
the actual values change.
