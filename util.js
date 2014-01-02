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

_.packageJsonGet = function packageJsonGet(projectPath) {
  var packageJsonFileLocation = _.path.join(projectPath, 'package.json');
  return fsReadJson(packageJsonFileLocation).then(function(packageJson) {
    return packageJson;
  });
}
_.packageJsonSave = function packageJsonSave(projectPath, packageJson) {
  var packageJsonFileLocation = _.path.join(projectPath, 'package.json');
  return fsWriteJson(packageJsonFileLocation, packageJson);
}
_.versionGet = function versionGet() {
  return _.packageJsonGet().then(function(packageJson) {
    return packageJson.version;
  });
}
_.versionSet = function versionSet(version) {
  return _.packageJsonGet().then(function(packageJson) {
    packageJson.version = version;
    return _.packageJsonSave(packageJson);
  });
}
_.versionIncr = function versionIncr(type) {
  // type can be major, minor, patch, or prerelase (from semver)
  return _.packageJsonGet().then(function(packageJson) {
    var version = packageJson.version;
    packageJson.version = _.semver.inc(version, type);
    return _.packageJsonSave(packageJson);
  });
}
_.tagsGet = function getTags() {
  return exec('git', ['tag'], {
    cwd: mainRepoFolder
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

_.gitCheckout = function gitCheckout(repoPath, branchName) {
  function checkoutDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', ['checkout', branchName], {
    cwd: repoPath
  }).then(checkoutDone, checkoutDone);
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

_.checkPush = function checkPush(repoPath, remote, branch) {
  function checkPushDone(out) {
    if (out.code == 0) return;
    else throw new Error(out.stderr);
  }
  return exec('git', ['push', '-n', remote, branch], {
    cwd: repoPath
  }).then(checkPushDone, checkPushDone);
}
