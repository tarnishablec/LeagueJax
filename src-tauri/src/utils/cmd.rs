use ntapi::ntpsapi::NtQueryInformationProcess;
use std::ptr;
use tauri::command;
use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, LocalFree, HANDLE, NTSTATUS};
use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

const PROCESS_COMMAND_LINE_INFORMATION: u32 = 60;
const STATUS_SUCCESS: NTSTATUS = 0;
const STATUS_INFO_LENGTH_MISMATCH: NTSTATUS = 0xC0000004u32 as i32;

#[allow(non_camel_case_types)]
#[repr(C)]
struct UNICODE_STRING {
    length: u16,
    maximum_length: u16,
    buffer: *mut u16,
}

#[command]
pub fn get_process_cmdline(pid: u32) -> Result<String, String> {
    unsafe {
        let handle: HANDLE = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            let err = GetLastError();
            return Err(format!("OpenProcess failed, error code: 0x{err:X} (Common reasons: the target process is running with administrator privileges, or the process has already exited)."));
        }

        let mut return_length = 0u32;
        let mut status = NtQueryInformationProcess(
            handle as _,
            PROCESS_COMMAND_LINE_INFORMATION,
            ptr::null_mut(),
            0,
            &mut return_length,
        );

        if status != STATUS_SUCCESS && status != STATUS_INFO_LENGTH_MISMATCH {
            CloseHandle(handle);
            return Err(format!("First query failed, status code: 0x{status:X}"));
        }

        let mut buffer = vec![0u8; return_length as usize];
        status = NtQueryInformationProcess(
            handle as _,
            PROCESS_COMMAND_LINE_INFORMATION,
            buffer.as_mut_ptr() as *mut _,
            return_length,
            &mut return_length,
        );

        CloseHandle(handle);

        if status != STATUS_SUCCESS {
            return Err(format!("Second query failed, status code: 0x{status:X}"));
        }

        let us = &*(buffer.as_ptr() as *const UNICODE_STRING);
        if us.buffer.is_null() || us.length == 0 {
            return Ok("".to_string());
        }

        let slice = std::slice::from_raw_parts(us.buffer, (us.length / 2) as usize);
        Ok(String::from_utf16_lossy(slice))
    }
}

use windows_sys::Win32::UI::Shell::CommandLineToArgvW;

pub fn parse_cmdline_to_args(full_cmd: &str) -> Vec<String> {
    if full_cmd.is_empty() {
        return Vec::new();
    }

    let mut argc = 0i32;
    unsafe {
        let wide_cmd: Vec<u16> = full_cmd.encode_utf16().chain(std::iter::once(0)).collect();

        let argv_ptr = CommandLineToArgvW(wide_cmd.as_ptr(), &mut argc);

        if argv_ptr.is_null() {
            return full_cmd.split_whitespace().map(|s| s.to_string()).collect();
        }

        let mut args = Vec::with_capacity(argc as usize);
        for i in 0..argc {
            let arg_ptr = *argv_ptr.offset(i as isize);

            let mut len = 0;
            while *arg_ptr.offset(len) != 0 {
                len += 1;
            }

            let arg_slice = std::slice::from_raw_parts(arg_ptr, len as usize);
            args.push(String::from_utf16_lossy(arg_slice));
        }

        LocalFree(argv_ptr as _);

        args
    }
}
