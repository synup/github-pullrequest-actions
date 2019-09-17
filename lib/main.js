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

function compareAndPublish(headCoverage, parsedCoverage, mergeCommentId) {
    var headCoverageStrings = []
    var passedComponents = []
    Object.keys(parsedCoverage).forEach(function(component) {
        if(headCoverage[component]) {
            headCoverageStrings.push(`**${component}**: HEAD ${headCoverage[component]}% CURRENT BRANCH ${parsedCoverage[component]}%`)
            if(parseFloat(parsedCoverage[component]) - parseFloat(headCoverage[component]) > 0) {
                passedComponents.push(component)
            }
        }
    })

    var body = '\\request_merge\n'
    headCoverageStrings.forEach(function(s) {
        body += `${s}\n`
    })

    var approval = passedComponents.length == Object.keys(parsedCoverage).length ? 'PASS' : 'FAIL'
    body += `MERGE REQUEST: **${approval}**`
    const octokit = new github.GitHub(process.env.GITHUB_TOKEN)
    octokit.issues.updateComment({
        owner: 'synup',
        repo: 'app',
        comment_id: mergeCommentId,
        body: body
    })
}

function checkAndPublishCoverage(parsedResult, mergeCommentId) {
    axios.get('https://kvdb.io/' + process.env.KVDB_SECRET_KEY + '/app').then(function(response) {
        compareAndPublish(response.data, parsedResult, mergeCommentId)
    })
}

function getComponentsCoverage(comment, mergeCommentId) {
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
        checkAndPublishCoverage(parsedResult, mergeCommentId)
    }
}

function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const context = github.context;
            console.log(JSON.stringify(context.payload))
            //var commentBody = context.payload.comment.body
            //var mergeCommentId = context.payload.comment.id
            // if(commentBody.match(/\\request_merge/)) {
            //     const pullRequestNumber = context.payload.issue.number
            //     const octokit = new github.GitHub(process.env.GITHUB_TOKEN)
            //     octokit.issues.listComments({
            //         owner: 'synup',
            //         repo: 'app',
            //         issue_number: pullRequestNumber
            //     }).then(function(response){
            //         if(Object.keys(response.data).length > 0) {
            //             response.data.forEach(function(comment){
            //                 if(comment.user.login == 'codecov[bot]') {
            //                     getComponentsCoverage(comment.body, mergeCommentId)
            //                 }
            //             })
            //         }
            //     })
            // }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
