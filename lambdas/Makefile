PYTHON ?= python3
LAMBDA_PYTHON_VERSION ?= 3.14
LAMBDA_PLATFORM ?= manylinux2014_aarch64

.PHONY: lint test build package clean security-scan

lint:
	ruff check src tests
	mypy src

test:
	pytest --cov=src --cov-report=term-missing

clean:
	rm -rf dist

build: package

package: clean
	mkdir -p dist
	mkdir -p dist/.package
	$(PYTHON) -m pip install \
		--platform $(LAMBDA_PLATFORM) \
		--implementation cp \
		--python-version $(LAMBDA_PYTHON_VERSION) \
		--only-binary=:all: \
		--upgrade \
		-r requirements.txt \
		-t dist/.package
	cp -R src/* dist/.package/
	find dist/.package -type d -name "__pycache__" -prune -exec rm -rf {} +
	find dist/.package -type f -name "*.pyc" -delete
	cd dist/.package && zip -qr ../public-api.zip .
	cd dist/.package && zip -qr ../admin-api.zip .
	rm -rf dist/.package

security-scan:
	pip-audit -r requirements.txt
	bandit -r src -ll
