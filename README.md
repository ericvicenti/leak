# leak

Leak helps release semantically-versioned node packages from git branches.

## Install

```
npm install -g leak
```


## Commands

### -S --start [branch_name]

creates a new feature branch off of `master`

### -C --commit [message]

### -R --release [type]


## Defaults / Config

The default git remote is `origin` and the default HEAD branch is `master`

Leak is not yet configurable. (But the source code is very simple, at least!)