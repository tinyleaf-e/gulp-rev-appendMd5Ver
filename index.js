var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Buffer = require('buffer').Buffer;
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var map = require('event-stream').map;

//var FILE_DECL = /(?:href=|src=|url\()['|"]([^\s>"']+?)\?v=([^\s>"']+?)['|"]/gi;
  var FILE_DECL = /(?:href=|src=|url\()['|"](\.\/|\.\.\/|\$\{pageContext\.request\.contextPath\}\/)([^\s>"']+?)(\.js|\.css|\.png)(\?v=[0-9a-z]{32})?(['|"])/gi;

var revPlugin = function revPlugin(show) {

  return map(function(file, cb) {

    var contents;
    var lines;
    var i, length;
    var line;
    var groups;
    var declarations;
    var dependencyPath;
    var data, hash;

    if(!file) {
      throw new PluginError('gulp-rev-append', 'Missing file option for gulp-rev-append.');
    }

    if(!file.contents) {
      throw new PluginError('gulp-rev-append', 'Missing file.contents required for modifying files using gulp-rev-append.');
    }

    contents = file.contents.toString();
    lines = contents.split('\n');
    length = lines.length;

    for(i = 0; i < length; i++) {
      line = lines[i];
      declarations = line.match(FILE_DECL);
      if (declarations && declarations.length > 0) {
        for(var j = 0; j < declarations.length; j++) {
          groups = FILE_DECL.exec(declarations[j]);
          if(groups && groups.length > 1) {
            // are we an "absoulte path"? (e.g. /js/app.js)
            var rePath='';
                  rePath=groups[1]+groups[2]+groups[3];
                  if(groups[1]=='${pageContext.request.contextPath}/')
                  rePath='/'+groups[2]+groups[3];
            /*if(groups[1]=='${pageContext.request.contextPath}/')
            {
              if(path.dirname(file.path).substring(path.dirname(file.path).length-5)=='views')
              {
                if(groups[2].startWith("views/"))
                  rePath = groups[2].substring(6)+groups[3];
                else
                  rePath=groups[1]+groups[2]+groups[3];
              }
              else
              {
                if(groups[2].startWith("views/"))
                  rePath = groups[2].replace('views/[^/]+?','..')+groups[3];
                else
                  rePath=groups[1]+groups[2]+groups[3];

              }
            }*/
            var normPath = path.normalize(rePath);
            if (normPath.indexOf(path.sep) === 0) {
              dependencyPath = path.join(file.base, normPath);
            }
            else {
              dependencyPath = path.resolve(path.dirname(file.path), normPath);
            }

            try {
              data = fs.readFileSync(dependencyPath);
              hash = crypto.createHash('md5');
              hash.update(data.toString(), 'utf8');
              line = line.replace(normPath+groups[4], normPath+"?v="+hash.digest('hex'));
              if(show=='success'||show=='all')
              console.log("success: " + line);
            }
            catch(e) {
              if(show=='error'||show=='all')
              {
                if(line.indexOf('${poster.template}')<0)
                  console.log(e);
              }
              // fail silently.
            }
          }
          FILE_DECL.lastIndex = 0;
        }
        lines[i] = line;
      }
    }

    file.contents = new Buffer(lines.join('\n'));
    cb(null, file);

  });

};

module.exports = revPlugin;