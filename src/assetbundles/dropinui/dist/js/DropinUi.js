/**
 * Commerce Braintree plugin for Craft CMS
 *
 * Commerce Braintree JS
 *
 * @author    Kurious Agency
 * @copyright Copyright (c) 2018 Kurious Agency
 * @link      https://kurious.agency
 * @package   CommerceBraintree
 * @since     1.0.0
 */

(function() {
	(function check() {
		if (typeof braintree !== 'undefined') {
			init();
		} else {
			setTimeout(check, 50);
		}
	})();

	function init($) {
		document.querySelectorAll('form').forEach(function($form) {
			var $dropinUi = $form.querySelector('[data-id="dropInUi"]');

			if (!$dropinUi) {
				return;
			}

			var $token = $form.querySelector('[name*="gatewayToken"]'),
				$nonce = $form.querySelector('[name*="nonce"]'),
				amount = $form.querySelector('[name*="amount"]').value,
				currency = $form.querySelector('[name*="currency"]').value,
				email = $form.querySelector('[name*="email"]').value,
				address = $form.querySelector('[name*="address"]').value,
				$submit = $form.querySelector('button[type="submit"], input[type="submit"]');

			$submit.dataset.text = $submit.innerText;
			if ($submit.dataset.loading) {
				$submit.dataset.text = $submit.dataset.loading;
			}

			var options = {
				authorization: $token.value,
				container: $dropinUi,
				locale: $dropinUi.dataset.locale,
				vaultManager: $dropinUi.dataset.manage,
				card: {
					cardholderName: {
						required: true
					},
					vault: {
						vaultCard: true,
						allowVaultCardOverride: true
					}
				}
			};
			if ($dropinUi.dataset.translations != '') {
				options.translations = JSON.parse($dropinUi.dataset.translations);
			}

			if (Boolean($dropinUi.dataset.subscription) != true) {
				options.paypal = {
					flow: 'checkout',
					env: $dropinUi.dataset.sandbox ? 'sandbox' : 'production',
					amount: amount,
					currency: currency,
					buttonStyle: {
						color: 'blue',
						shape: 'rect',
						size: 'responsive',
						label: 'paypal'
					}
				};

				options.applePay = {
					displayName: $dropinUi.dataset.name,
					paymentRequest: {
						total: {
							label: $dropinUi.dataset.name,
							amount: amount
						}
					}
				};

				options.googlePay = {
					merchantId: $dropinUi.dataset.googlePayId,
					googlePayVersion: 2,
					transactionInfo: {
						countryCode: address ? JSON.parse(address).countryCodeAlpha2 : '',
						currencyCode: currency,
						totalPriceStatus: 'FINAL',
						totalPrice: amount
					}
				};
			} else {
				options.card.vault.allowVaultCardOverride = false;
			}

			if ($dropinUi.dataset.threedsecure) {
				options.threeDSecure = true;
			}

			braintree.dropin.create(options, function(err, dropinInstance) {
				if (err) {
					console.error(err);
					if (window.braintreeError) {
						window.braintreeError(err);
					}
					return;
				}

				if (dropinInstance.isPaymentMethodRequestable()) {
					reset($submit);
				}
				//need for vault
				dropinInstance.on('paymentMethodRequestable', function(e) {
					reset($submit);
				});
				dropinInstance.on('noPaymentMethodRequestable', function(e) {
					processing($submit);
				});
				dropinInstance.on('paymentOptionSelected', function(e) {
					//$submit.prop('disabled', false);
				});

				$form.addEventListener(
					'submit',
					formSubmit({
						dropinInstance: dropinInstance,
						threeDSecure: $dropinUi.dataset.threedsecure,
						options: {
							threeDSecure: {
								amount: amount,
								email: email,
								billingAddress: address ? JSON.parse(address) : address
							}
						}
					})
				);
			});
		});
	}

	function formSubmit(data) {
		return function submitHandler(e) {
			e.preventDefault();
			// console.log(data);
			// console.log(e);
			var dropinInstance = data.dropinInstance,
				$form = e.currentTarget,
				threeDSecure = data.threeDSecure,
				$submit = $form.querySelector('button[type="submit"], input[type="submit"]');
			processing($submit);

			dropinInstance.requestPaymentMethod(threeDSecure ? data.options : {}, function(err, payload) {
				if (err) {
					console.error(err);
					if (window.braintreeError) {
						window.braintreeError(err);
					}
					reset($submit);
					return;
				}
				//console.log(payload);
				if ((payload.liabilityShiftPossible && payload.liabilityShifted) || !payload.liabilityShiftPossible || payload.type !== 'CreditCard' || !threeDSecure) {
					processing($submit);
					$form.querySelector('input[name*=nonce]').value = payload.nonce;
					$form.removeEventListener('submit', formSubmit);
					$form.submit();
				} else {
					if (window.braintreeError) {
						window.braintreeError('3ds failed');
					}
					//dropinInstance.clearSelectedPaymentMethod();
					reset($submit);
					//$submit.prop('disabled', true);
				}
			});
		}
	}

	function reset($button) {
		$button.disabled = false;
		$button.innerText = $button.dataset.text;
	}

	function processing($button) {
		$button.disabled = true;
		if ($button.dataset.processing) {
			$button.innerText = $button.dataset.processing;
		}
	}
})();
