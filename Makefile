
build:
	@node_modules/.bin/browserify public/index.js -t babelify -o public/bundle.js

start: build
	node -r babel-core/register .

clean:
	@rm -rf public/bundle.js

.PHONY: build start clean
