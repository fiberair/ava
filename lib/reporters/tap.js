'use strict';
const format = require('util').format;
const indentString = require('indent-string');
const stripAnsi = require('strip-ansi');
const extractStack = require('../extract-stack');

// Parses stack trace and extracts original function name, file name and line
function getSourceFromStack(stack) {
	return extractStack(stack).split('\n')[0];
}

function yamlBlockPropertyValue(value) {
	const string = String(value);
	return string.includes('\n') ?
		`|\n${indentString(string, 6)}` :
		string;
}

function yamlBlock(error, includeMessage) {
	const output = [];

	if (error.name) {
		output.push(`    name: ${yamlBlockPropertyValue(error.name)}`);
	}
	if (includeMessage && error.message) {
		output.push(`    message: ${yamlBlockPropertyValue(error.message)}`);
	}
	if (error.operator) {
		output.push(`    operator: ${yamlBlockPropertyValue(error.operator)}`);
	}
	if (typeof error.actual === 'string') { // Be sure to print empty strings, which are falsy
		output.push(`    actual: ${yamlBlockPropertyValue(stripAnsi(error.actual))}`);
	}
	if (typeof error.expected === 'string') { // Be sure to print empty strings, which are falsy
		output.push(`    expected: ${yamlBlockPropertyValue(stripAnsi(error.expected))}`);
	}
	if (error.stack) {
		output.push(`    at: ${getSourceFromStack(error.stack)}`);
	}

	return `  ---\n${output.join('\n')}\n  ...`;
}

class TapReporter {
	constructor() {
		this.i = 0;
	}
	start() {
		return 'TAP version 13';
	}
	test(test) {
		let output;

		let directive = '';
		const passed = test.todo ? 'not ok' : 'ok';

		if (test.todo) {
			directive = '# TODO';
		} else if (test.skip) {
			directive = '# SKIP';
		}

		const title = stripAnsi(test.title);

		if (test.error) {
			output = [
				'# ' + title,
				format('not ok %d - %s', ++this.i, title),
				yamlBlock(test.error, true)
			];
		} else {
			output = [
				`# ${title}`,
				format('%s %d - %s %s', passed, ++this.i, title, directive).trim()
			];
		}

		return output.join('\n');
	}
	unhandledError(err) {
		const output = [
			`# ${err.message}`,
			format('not ok %d - %s', ++this.i, err.message)
		];
		// AvaErrors don't have stack traces
		if (err.type !== 'exception' || err.name !== 'AvaError') {
			output.push(yamlBlock(err, false));
		}

		return output.join('\n');
	}
	finish(runStatus) {
		const output = [
			'',
			'1..' + (runStatus.passCount + runStatus.failCount + runStatus.skipCount),
			'# tests ' + (runStatus.passCount + runStatus.failCount + runStatus.skipCount),
			'# pass ' + runStatus.passCount
		];

		if (runStatus.skipCount > 0) {
			output.push(`# skip ${runStatus.skipCount}`);
		}

		output.push('# fail ' + (runStatus.failCount + runStatus.rejectionCount + runStatus.exceptionCount), '');

		return output.join('\n');
	}
	write(str) {
		console.log(str);
	}
	stdout(data) {
		process.stderr.write(data);
	}
	stderr(data) {
		this.stdout(data);
	}
}

module.exports = TapReporter;
