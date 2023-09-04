const core = require('@actions/core');
const github = require('@actions/github');

const main = async () => {
    try {
        /**
         * We need to fetch all the inputs that were provided to our action
         * and store them in variables for us to use.
         **/
        const owner = core.getInput('owner', { required: true });
        const repo = core.getInput('repo', { required: true });
        const pr_number = core.getInput('pr_number', { required: true });
        const token = core.getInput('token', { required: true });

        /**
         * Now we need to create an instance of Octokit which will use to call
         * GitHub's REST API endpoints.
         * We will pass the token as an argument to the constructor. This token
         * will be used to authenticate our requests.
         * You can find all the information about how to use Octokit here:
         * https://octokit.github.io/rest.js/v18
         **/
        const octokit = new github.getOctokit(token);

        /**
         * We need to fetch the list of files that were changes in the Pull Request
         * and store them in a variable.
         * We use octokit.paginate() to automatically loop over all the pages of the
         * results.
         * Reference: https://octokit.github.io/rest.js/v18#pulls-list-files
         */

        const { data: changedFiles } = await octokit.paginate("GET /repos/:owner/:repo/pulls/:pull_number/files", {
            owner: owner,
            repo: repo,
            pull_number: pr_number
        });
        console.log(changedFiles)

        /**
         * Contains the sum of all the additions, deletions, and changes
         * in all the files in the Pull Request.
         **/
        let diffData = {
            additions: 0,
            deletions: 0,
            changes: 0
        };
        let found_packageJson = false;

        /**
         * Loop over all the files changed in the PR and add labels according 
         * to files types.
         **/
        for (const file of changedFiles) {
            /**
             * Add labels according to file types.
             */
            if (file.filename === "package.json") {
                found_packageJson = true;
                diffData.additions += file.additions;
                diffData.deletions += file.deletions;
                diffData.changes += file.changes;
            }
        }

        /**
         * Create a comment on the PR with the information we compiled from the
         * list of changed files.
         */
        if (found_packageJson === true) {
            await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: pr_number,
                body: `
            Pull Request #${pr_number} has been updated with the modification of [ package.json ]: \n
            - ${diffData.changes} changes \n
            - ${diffData.additions} additions \n
            - ${diffData.deletions} deletions \n
          `
            });
        }

    } catch (error) {
        core.setFailed(error.message);
    }
}

// Call the main function to run the action
main();