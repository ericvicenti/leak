var _ = module.exports = require('underscore');

_.Q = require('q');
_.path = require('path');
_.fs = require('fs');
_.semver = require('semver');
_.str = require('underscore.string');

_.pkg = JSON.parse(_.fs.readFileSync(_.path.join(__dirname, 'package.json'), { encoding: 'utf8' }));


var spawn = require('child_process').spawn;

var fsReadFile = _.Q.denodeify(_.fs.readFile);
var fsWriteFile = _.Q.denodeify(_.fs.writeFile);
var fsReaddir = _.Q.denodeify(_.fs.readdir);
var fsReadFileUtf8 = function(fileName) {
  return fsReadFile(fileName, { encoding: 'utf8' });
}
var fsWriteFileUtf8 = function(fileName, fileDataString) {
  return fsWriteFile(fileName, fileDataString, { encoding: 'utf8' });
}
var fsReadJson = function(fileName) {
  return fsReadFileUtf8(fileName).then(function(fileString) {
    return JSON.parse(fileString);
  });
}
var fsWriteJson = function(fileName, data) {
  return fsWriteFileUtf8(fileName, JSON.stringify(data, null, 2));
}

function exec(command, args, opts) {
  console.log('STARTING EXEC ', command, args);
  var doExec = _.Q.defer();
  var process = spawn(command, args, opts);
  var output = {
    stdout: '',
    stderr: ''
  }
  process.stdout.on('data', function (data) {
    output.stdout += data;
  });
  process.stderr.on('data', function (data) {
    output.stderr += data;
  });
  process.on('close', function (code) {
    output.code = code;
    console.log('EXEC RESPONSE ', command, args, output);
    if (code == 0) doExec.resolve(output);
    else doExec.reject(output);
  });
  return doExec.promise;
}

_.packageJsonGet = function packageJsonGet(repoPath) {
  var packageJsonFileLocation = _.path.join(repoPath, 'package.json');
  return fsReadJson(packageJsonFileLocation).then(function(packageJson) {
    return packageJson;
  });
}
_.packageJsonSave = function packageJsonSave(repoPath, packageJson) {
  var packageJsonFileLocation = _.path.join(repoPath, 'package.json');
  return fsWriteJson(packageJsonFileLocation, packageJson);
}
_.packageJsonStage = function packageJsonStage(repoPath) {
  return _.gitAdd(repoPath, 'package.json');
}

_.getBranchVersion = function(version, branchName) {
  var vParts = version.split('-');
  var newVersion = vParts[0] + '-' + branchName + '.0';
  return newVersion;
}
_.versionGet = function versionGet(repoPath) {
  return _.packageJsonGet(repoPath).then(function(packageJson) {
    return packageJson.version;
  });
}
_.versionSet = function versionSet(repoPath, version) {
  return _.packageJsonGet(repoPath).then(function(packageJson) {
    packageJson.version = version;
    return _.packageJsonSave(packageJson);
  });
}
_.versionSetBranch = function versionSetBranch(repoPath, branchName) {
   return _.packageJsonGet(repoPath).then(function(packageJson) {
    var oldVersion = packageJson.version;
    var newVersion = _.getBranchVersion(packageJson.version, branchName);
    if (newVersion == oldVersion) {
      throw new Error('Cannot set duplicate version "'+newVersion+'"!');
    }
    packageJson.version = newVersion;
    return _.packageJsonSave(repoPath, packageJson).then(function() {
      return newVersion;
    });
  }); 
}
_.versionIncr = function versionIncr(repoPath, type) {
  // type can be major, minor, patch, or prerelase (from semver)
  return _.packageJsonGet(repoPath).then(function(packageJson) {
    var version = packageJson.version;
    var newVersion = _.semver.inc(version, type);
    packageJson.version = newVersion;
    return _.packageJsonSave(repoPath, packageJson).then(function() {
      return newVersion;
    });
  });
}
_.tagsGet = function getTags(repoPath) {
  return exec('git', ['tag'], {
    cwd: repoPath
  }).then(function(results) {
    var out = results.stdout;
    var tags = out.split('\n');
    tags = _.filter(tags, function(tag) {
      if (_.isString(tag) && tag != '') return true;
    });
    return tags;
  });
}

_.tagsMake = function tagsMake(repoPath, tagName) {
  function tagsMakeDone(out) {
    if (out.code == 0) return;
    else if (_.str.include(out.stderr, 'already exists')) throw new Error(out.stderr);
    else throw new Error('unexpected!');
  }
  return exec('git', ['tag', tagName], {
    cwd: repoPath
  }).then(tagsMakeDone, tagsMakeDone);
}
_.tagsRemove = function tagsRemove(repoPath, tagName) {
  function tagsRemoveDone(out) {
    if (out.code == 0) return;
    else if (_.str.include(out.stderr, 'not found')) throw new Error(out.stderr);
    else throw new Error('unexpected!');
  }
  return exec('git', ['tag', '-d', tagName], {
    cwd: repoPath
  }).then(tagsRemoveDone, tagsRemoveDone);
}


_.checkIfGitRepo = function checkIfGitRepo(path) {
  return fsReaddir(path).then(function(files) {
    return _.include(files, '.git');
  });
}

_.getRepo = function getRepo(path) {
  if(!path) path = process.cwd();
  return _.checkIfGitRepo(path).then(function(isRepo) {
    if (isRepo) return path;
    else {
      if (path == '/') return false;
      var parentPath = _.path.join(path, '..');
      return _.getRepo(parentPath);
    }
  });
}

_.gitPull = function gitPull(repoPath, originName, remoteBranchName) {
  function pullDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'pull', originName, remoteBranchName ], {
    cwd: repoPath
  }).then(pullDone, pullDone);
}

_.gitCommit = function gitCommit(repoPath, message) {
  function commitDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'commit', '-m', message ], {
    cwd: repoPath
  }).then(commitDone, commitDone);
}

_.gitAdd = function gitAdd(repoPath, fileName) {
  function addDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'add', fileName ], {
    cwd: repoPath
  }).then(addDone, addDone);
}

_.gitPush = function gitPush(repoPath, remote, srcRef, destRef) {
  if (!destRef) destRef = srcRef;
  function pushDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'push', remote, srcRef+':'+destRef ], {
    cwd: repoPath
  }).then(pushDone, pushDone);
}

_.checkPush = function checkPush(repoPath, remote, srcRef, destRef) {
  if (!destRef) destRef = srcRef;
  function checkPushDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', ['push', '-n', remote, srcRef+':'+destRef], {
    cwd: repoPath
  }).then(checkPushDone, checkPushDone);
}

_.gitPushTag = function gitPushTag(repoPath, originName, tagName) {
  function pushDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'push', originName, tagName ], {
    cwd: repoPath
  }).then(pushDone, pushDone);
}

_.gitCheckout = function gitCheckout(repoPath, branchName) {
  function checkoutDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'checkout', branchName ], {
    cwd: repoPath
  }).then(checkoutDone, checkoutDone);
}

_.gitNewBranch = function gitCheckout(repoPath, branchName) {
  function newBranchDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'checkout', '-b', branchName ], {
    cwd: repoPath
  }).then(newBranchDone, newBranchDone);
}

_.gitSetBranchTracking = function gitSetBranchTracking(repoPath, originName, remoteBranchName) {
  function setBranchDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'branch', '--set-upstream-to', originName + '/' + remoteBranchName ], {
    cwd: repoPath
  }).then(setBranchDone, setBranchDone);
}

_.getRepoName = function getRepoName(path) {
  return _.getRepo(path).then(function(repoPath) {
    if (repoPath) return _.path.basename(repoPath);
  });
}

_.getBranchName = function getBranchName(path) {
  function tagsRemoveDone(out) {
    if (out.code == 0) return out.stdout.trim();
    else if (_.str.include(out.stderr, 'not found')) throw new Error(out.stderr);
    else throw new Error('unexpected!');
  }
  return exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: path
  }).then(tagsRemoveDone, tagsRemoveDone);
}

_.deleteRemoteRef = function deleteRemoteRef(repoPath, remote, ref) {
  function deleteRemoteRefDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', ['push', remote, ':'+ref], {
    cwd: repoPath
  }).then(deleteRemoteRefDone, deleteRemoteRefDone);
}

_.deleteRemoteBranch = function deleteRemoteBranch(repoPath, remote, branch) {
  return deleteRemoteRef(repoPath, remote, 'heads/'+branch);
}

_.deleteRemoteTag = function deleteRemoteTag(repoPath, remote, tag) {
  return deleteRemoteRef(repoPath, remote, 'tags/'+tag);
}

_.fetchRemoteTags = function fetchRemoteTags(repoPath, remote) {
  // remote is optional. when it is undefined, git will fetch tags from all repos.
  function deleteRemoteRefDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', [ 'fetch', '--tags', remote ], {
    cwd: repoPath
  }).then(deleteRemoteRefDone, deleteRemoteRefDone);
}

_.getAllTags = function getAllTags(repoPath, remote) {
  return _.fetchRemoteTags(repoPath, remote).then(function() {
    return _.getTags(repoPath).then(function(tags) {
      return tags;
    });
  })
}

_.deleteLocalBranchTags = function deleteLocalBranchTags(repoPath, branch) {

}

_.deleteRemoteBranchTags = function deleteRemoteBranchTags(repoPath, branch, remote) {
  // remote is optional. when it is undefined, we wipe branch tags from all repos.

}
