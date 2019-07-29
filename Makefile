
CONDUCTOR_TAR	= conductor-v0.0.18-alpha1-x86_64-generic-linux-gnu.tar.gz
CLI_TAR		= cli-v0.0.18-alpha1-x86_64-generic-linux-gnu.tar.gz

install: hc-conductor hc-cli

hc-conductor:	$(CONDUCTOR_TAR)
	tar -xzvf $<
	sudo cp ./conductor-v0.0.18-alpha1-x86_64-unknown-linux-gnu/holochain	/usr/local/bin
hc-cli:		$(CLI_TAR)
	tar -xzvf $<
	sudo cp ./cli-v0.0.18-alpha1-x86_64-unknown-linux-gnu/hc		/usr/local/bin

$(CONDUCTOR_TAR):
	wget "https://github.com/holochain/holochain-rust/releases/download/v0.0.18-alpha1/conductor-v0.0.18-alpha1-x86_64-generic-linux-gnu.tar.gz"

$(CLI_TAR):
	wget "https://github.com/holochain/holochain-rust/releases/download/v0.0.18-alpha1/cli-v0.0.18-alpha1-x86_64-generic-linux-gnu.tar.gz"
