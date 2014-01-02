# leak

Leak helps release semantically-versioned node packages from git branches.

__Status: Leak is unstable and should be used at your own risk.__

## Install

Install [leak](https://npmjs.org/package/leak) with [npm](https://npmjs.org/).

```
npm install -g leak
```

Leak can now be run as a command

```
$ leak --help

  Usage: leak [options]

  Options:

    -h, --help                        output usage information
    -V, --version                     output the version number
    -S, --start [name]                Start working on a branch, synced with origin, and properly versioned
    -C, --commit [message]            Commit progress on this branch
    -R, --release [type]              Cut a version (of a type like minor or patch), push to master, and close this branch
    --clean [do_clean]                Clean the feature branch and tags after release? Default [true]
    --clean-remote [do_clean_remote]  Clean the remote feature branch and tags after release? Default [true]
    --npm-publish [do_npm_publish]    Should publish npm module if package.json public=true? Default [true]

```

## Setup

Other than the following restrictions, leak should work fine with existing repositories.

Leak can be run inside of a properly configured repository. The repo must have `master` as the main branch, and `origin` as the main remote.

The `package.json` file must be present at the top-level of the repo and be valid JSON. The `version` value must be a proper [semantic version](http://semver.org/).


# Commands

## -S --start [branch]

* tries to checkout $branch. if it already exists and is checked out:
  * run `git pull origin $branch`
* if the branch doesnt already exist:
  * creates a new branch named $branch off of the current git repo
  * set to track $branch on `origin`. if branch is successfully tracked:
    * git pull
  * if branch cannot track remote because no remote branch:
    * updates version for the branch in `package.json` to match `X.X.X-$branch.X`
    * publishes the new branch to `origin`

### Options

* `-S --start [branch_name]` - Specify the name for the branch


## -C --commit [message]

* notices the current $repo & $branch
* runs `git pull origin $branch`
* increments the prerelease $version in `package.json'
* stages `package.json`
* commits all staged changes with the $message provided
* tags the commit with the new version
* pushes commits and tags to `origin $branch`

### Options

* `-C --commit [message]` - Set the commit message


## -R --release [type]

* notices the current $repo & $branch
* runs `git pull origin $branch`
* if branch is not `master`:
  * runs `git pull origin master`
* increments the $version by $type in `package.json'
* stages `package.json`
* commits all staged changes with the $message provided, otherwise 'release $type $version'
* tag the commit with the new version
* pushes commits on $branch and the tag to `origin`
* if $branch is not `master`:
  * push branch to `origin master`
  * checkout `master`, pull `origin master`
  * if cleaning is enabled:
    * remove all local tags which match: `X.X.X-$branch.X`
    * remove the local $branch
    * if remote cleaning is enabled:
      * remove all remote tags which match: `X.X.X-$branch.X`
      * remove the remote $branch
* if `public === true` in `package.json`:
  * run `npm publish`


### Options

* `-R --release [type]` - Specify the type of the release
* `-C --commit [message]` - Override the commit message for the release
* `--clean [do_clean]` - If set to `false`, no cleaning will be done
* `--clean-remote [do_clean_remote]` - If set to `false`, nothing remote will be cleaned
* `--npm-publish [do_npm_publish]` - If set to `false`, npm will not publish


## Defaults / Config

The default git remote is `origin` and the default HEAD branch is `master`

Leak is not yet configurable. (But the source code is very simple, at least!)

