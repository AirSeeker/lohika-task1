const requestPromise = require('request-promise');

const domain = 'https://api.github.com';
const repositoriesPath = `${domain}/orgs/:org/repos`;
const contributorsPath = `${domain}/repos/:owner/:repo/contributors`;
const repositoriesOffset = 0;
const repositoriesLimit = 3;
const requestOptions = {
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true
};

if (process.env.npm_package_config_gitHubToken) {
    requestOptions.headers['Authorization'] = `token ${process.env.npm_package_config_gitHubToken}`;
}

const getRepositoriesUrl = org => repositoriesPath.replace(':org', org);
const getContributorsUrl = (owner, repo) => contributorsPath.replace(':owner', owner).replace(':repo', repo);

async function getRepositories(gitHubOrgName) {
    requestOptions.uri = getRepositoriesUrl(gitHubOrgName);
    return requestPromise(requestOptions).then(result => result.slice(repositoriesOffset, repositoriesLimit));
}

const setRepositoryContributors = (result, repository) => {
    repository.contributors = [];
    result.forEach(contributor => {
        repository.contributors.push(contributor)
    });
    return repository;
};

async function getRepositoriesContributors(repositories) {
    let listOfRequests = [];
    repositories.forEach(repository => {
        requestOptions.uri = getContributorsUrl(repository.owner.login, repository.name);
        let contributorsRequest = requestPromise(requestOptions)
            .then(result => setRepositoryContributors(result, repository));
        listOfRequests.push(contributorsRequest);
    });

    return Promise.all(listOfRequests);
}

const prepareResult = repositories => {
    let result = {};
    repositories.forEach(repository => {
        result[repository.name] = [];
        repository.contributors.forEach(contributor => {
            result[repository.name].push(contributor.login);
        });
    });
    return result;
};

async function getContributors(gitHubOrgName) {
    let repositories = await getRepositories(gitHubOrgName);
    await getRepositoriesContributors(repositories);
    return prepareResult(repositories);
}

let gitHubOrgName = process.argv[2] || 'nodejs';
getContributors(gitHubOrgName).then(console.log).catch(console.error);