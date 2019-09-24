"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const core = require('@actions/core')
const github = require('@actions/github')
const axios = require('axios')

function getCoverage(line) {
    var contents = line.trim().split('|')
    if(contents[2].match(/%/)) {
        var component = contents[1].trim().split('#')[1]
        var coverage = contents[2].trim().split('%')[0].split('`')[1]
        return { component: component, coverage: coverage }
    }
    return null
}

function checkAndPublishCoverage(parsedResult) {
    axios.get('https://kvdb.io/' + process.env.KVDB_SECRET_KEY + '/app').then(function(response) {
        var storedCoverage = response.data
        Object.keys(parsedResult).forEach(function(component) {
            storedCoverage[component] = parseFloat(parsedResult[component])
        })
        axios.post('https://kvdb.io/' + process.env.KVDB_SECRET_KEY + '/app', storedCoverage).catch(function(error) {
            console.log(error)
        })
    })
}

function getComponentsCoverage(comment) {
    var bodyLines = comment.split('\n')
    var componentLines = []
    var parsedResult = {}

    bodyLines.forEach(function(line) {
        if(line.match(/interactions|locations|insights|posts|v2app|rankings|client|scantool|reviewfunnel|notifications/)) {
            const coverageResult = getCoverage(line)
            if(coverageResult) {
                const { component, coverage } = coverageResult
                parsedResult[component] = coverage
            }
        }
    })

    if(Object.keys(parsedResult).length > 0){
        checkAndPublishCoverage(parsedResult)
    }
}

function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const context = github.context;
            console.log(JSON.stringify(context.payload))
            var pullRequest = context.payload.pull_request
            if(pullRequest.merged == true && pullRequest.base.ref == 'master') {
                const pullRequestNumber = pullRequest.number
                const octokit = new github.GitHub(process.env.GITHUB_TOKEN)
                octokit.issues.listComments({
                    owner: 'synup',
                    repo: 'app',
                    issue_number: pullRequestNumber
                }).then(function(response){
                    if(Object.keys(response.data).length > 0) {
                        response.data.forEach(function(comment){
                            if(comment.user.login == 'codecov[bot]') {
                                getComponentsCoverage(comment.body)
                            }
                        })
                    }
                })
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
