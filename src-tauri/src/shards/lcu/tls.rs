use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};

use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::crypto::{self, WebPkiSupportedAlgorithms};
use rustls::pki_types::{CertificateDer, ServerName, UnixTime};
use rustls::{ClientConfig, DigitallySignedStruct, Error as TlsError, SignatureScheme};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct LocalClientCertPinKey {
    pid: u32,
    scope: &'static str,
}

static LCU_CERT_PINS: OnceLock<Mutex<HashMap<LocalClientCertPinKey, Vec<u8>>>> = OnceLock::new();

fn cert_pin_store() -> &'static Mutex<HashMap<LocalClientCertPinKey, Vec<u8>>> {
    LCU_CERT_PINS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn is_loopback_server_name(server_name: &ServerName<'_>) -> bool {
    match server_name {
        ServerName::IpAddress(ip) => std::net::IpAddr::from(*ip).is_loopback(),
        ServerName::DnsName(_) => false,
        _ => false,
    }
}

fn supported_algorithms() -> WebPkiSupportedAlgorithms {
    if let Some(provider) = crypto::CryptoProvider::get_default() {
        return provider.signature_verification_algorithms;
    }
    crypto::ring::default_provider().signature_verification_algorithms
}

#[derive(Debug, Clone, Copy)]
struct PinnedLocalClientCertVerifier {
    key: LocalClientCertPinKey,
    algorithms: WebPkiSupportedAlgorithms,
}

impl PinnedLocalClientCertVerifier {
    fn new(pid: u32, scope: &'static str) -> Self {
        Self {
            key: LocalClientCertPinKey { pid, scope },
            algorithms: supported_algorithms(),
        }
    }
}

impl ServerCertVerifier for PinnedLocalClientCertVerifier {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: UnixTime,
    ) -> Result<ServerCertVerified, TlsError> {
        if !is_loopback_server_name(server_name) {
            return Err(TlsError::General(
                "LCU TLS pinning only allows loopback server names".to_string(),
            ));
        }

        let cert_bytes = end_entity.as_ref();
        let mut pins = cert_pin_store()
            .lock()
            .map_err(|_| TlsError::General("LCU certificate pin store is poisoned".to_string()))?;

        if let Some(pinned_cert) = pins.get(&self.key) {
            if pinned_cert.as_slice() == cert_bytes {
                return Ok(ServerCertVerified::assertion());
            }
            return Err(TlsError::General(format!(
                "Local client TLS certificate pin mismatch for pid {} scope {}",
                self.key.pid, self.key.scope
            )));
        }

        pins.insert(self.key, cert_bytes.to_vec());
        Ok(ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        message: &[u8],
        cert: &CertificateDer<'_>,
        dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, TlsError> {
        crypto::verify_tls12_signature(message, cert, dss, &self.algorithms)
    }

    fn verify_tls13_signature(
        &self,
        message: &[u8],
        cert: &CertificateDer<'_>,
        dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, TlsError> {
        crypto::verify_tls13_signature(message, cert, dss, &self.algorithms)
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        self.algorithms.supported_schemes()
    }
}

pub fn build_local_client_tls_config(pid: u32, scope: &'static str) -> ClientConfig {
    ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(PinnedLocalClientCertVerifier::new(pid, scope)))
        .with_no_client_auth()
}

pub fn build_lcu_client_tls_config(pid: u32) -> ClientConfig {
    build_local_client_tls_config(pid, "league-client")
}

pub fn clear_lcu_cert_pin(pid: u32) {
    if let Ok(mut pins) = cert_pin_store().lock() {
        pins.retain(|key, _| key.pid != pid);
    }
}
