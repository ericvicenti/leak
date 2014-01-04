# leak

> "leaking itself since 2014"

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
    --npm-publish [do_npm_publish]    Publish npm module on release? By default, publish if package.json private === false
    --main-branch [main_branch]       Specify the 'master' branch which gets released to. Default ['master']
    --remote [remote]                 Specify the remote repo to use. 'false' for no remote actions. Default ['origin']

```

## Setup

Other than the following restrictions, leak should work fine with existing repositories and node modules.

There must be an existing branch with the name of the main branch, defaulting to master.

The `package.json` file must be present at the top-level of the repo and be valid JSON. The `version` value must be a proper [semantic version](http://semver.org/).


# Commands

Leak has 3 main actions: Start, Commit, and Release.

Leak will run 'Commit' (`-C`) by default if nothing is provided.

Commit can be combined with start or release, because a commit always happens to change the version. When starting or releasing, the commit flag is used to override the message.



## -S --start [branch]

"Switch to a new or existing branch"

### Start Behavior

* tries to checkout $branch. if it already exists and is checked out:
  * try to run `git pull origin $branch`. if the branch does not exist remotely:
    * continue as if the branch had been just created (see below) 
* if the branch doesnt already exist:
  * creates a new branch named $branch off of the current git repo
  * set to track $branch on `origin`. if branch is successfully tracked:
    * git pull
  * if branch cannot track remote because no remote branch:
    * updates version for the branch in `package.json` to match `X.X.X-$branch.X`
    * stages and commits `package.json`
    * publishes the new branch to `origin`

### Start Options

* `-S --start [branch_name]` - Specify the name for the branch



## -C --commit [message]

"Commit progress on the current branch."

### Commit Behavior

* notices the current $repo & $branch
* `git pull origin $branch`
* increments the prerelease $version in `package.json'
* stages `package.json`
* commits all staged changes with the $message provided
* tags the commit with the new version
* pushes commits and tags to `origin $branch`

### Commit Options

* `-C --commit [message]` - Set the commit message



## -R --release [type]

"Release the currently-staged branch to remote master and npm, then wipe the branch and old tags"

### Release Behavior

* notices the current $repo & $branch
* `git pull origin $branch`
* if branch is not `master`:
  * `git pull origin master`
  * checkout master to make sure working copy doesn't conflict
  * checkout $branch again
* increments the $version by $type in `package.json'
* stages `package.json`
* commits all staged changes with the $message provided, otherwise 'release $type $version'
* tag the commit with the new version
* pushes commits on $branch and the tag to `origin`
* if $branch is not `master`:
  * push $branch to `origin master`
  * checkout `master`, pull `origin master`
  * if cleaning is enabled:
    * remove all local tags which match: `X.X.X-$branch.X`
    * remove the local $branch
    * if remote cleaning is enabled:
      * remove all remote tags which match: `X.X.X-$branch.X`
      * remove the remote $branch
* if `private === false` in `package.json` or if npm is enabled
  * `npm publish`

### Release Options

* `-R --release [type]` - Specify the type of the release
* `-C --commit [message]` - Override the commit message for the release
* `--clean [do_clean]` - If set to `false`, no cleaning will be done
* `--clean-remote [do_clean_remote]` - If set to `false`, nothing remote will be cleaned
* `--npm-publish [do_npm_publish]`
  * publish to npm if `true`
  * if set to `false`, npm will not publish
  * by default, publish if [private](https://npmjs.org/doc/files/package.json.html#private) is `false` in `package.json`



# More


## Changelog

### v0.1.0 - First release

* main workflow: start, commit, release
* now good enough to manage its own releases
